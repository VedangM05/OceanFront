import numpy as np
import pandas as pd
import glob
import os
from sklearn.preprocessing import MinMaxScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error
import matplotlib.pyplot as plt
import joblib
import tensorflow as tf
from tensorflow import keras
from keras.models import Sequential
from keras.layers import LSTM, Dense, Dropout
from keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau

np.random.seed(42)
tf.random.set_seed(42)

class MLDPredictor:
    def __init__(self, parquet_dir, model_save_dir='backend/models'):
        self.parquet_dir = parquet_dir
        self.model_save_dir = model_save_dir
        self.model = None
        self.scaler_X = MinMaxScaler()
        self.scaler_y = MinMaxScaler()
        os.makedirs(model_save_dir, exist_ok=True)

    def load_multiple_parquet_files(self):
        print("[INFO] Loading Parquet files...")
        parquet_files = glob.glob(os.path.join(self.parquet_dir, '*.parquet'))
        print(f"[INFO] Found {len(parquet_files)} Parquet files")
        if len(parquet_files) == 0:
            raise ValueError(f"No Parquet files found in {self.parquet_dir}")
        dfs = []
        for file in parquet_files:
            try:
                df = pd.read_parquet(file)
                dfs.append(df)
                print(f"[INFO] Loaded {file}: {len(df)} rows")
            except Exception as e:
                print(f"[WARNING] Could not load {file}: {e}")
        combined_df = pd.concat(dfs, ignore_index=True)
        print(f"[INFO] Total rows after combining: {len(combined_df)}")
        return combined_df

    # ---------- NEW: Argo normalization ----------
    def normalize_argo_columns(self, df):
        """
        Map Argo names (pres/temp/psal) to generic names (depth/temperature/salinity),
        prefer *_adjusted if present and valid, apply QC if available, and build
        date_time and profile_id needed for MLD computation.
        """
        # Choose adjusted vars if present, else raw
        pres_col = 'pres_adjusted' if 'pres_adjusted' in df.columns else ('pres' if 'pres' in df.columns else None)
        temp_col = 'temp_adjusted' if 'temp_adjusted' in df.columns else ('temp' if 'temp' in df.columns else None)
        psal_col = 'psal_adjusted' if 'psal_adjusted' in df.columns else ('psal' if 'psal' in df.columns else None)

        missing = [cname for cname in [('pres/pres_adjusted', pres_col),
                                       ('temp/temp_adjusted', temp_col),
                                       ('psal/psal_adjusted', psal_col)] if cname[1] is None]
        if missing:
            raise ValueError(f"Argo variables missing: {[m[0] for m in missing]}")

        out = df.copy()

        # Optional: filter by QC if present (keep '1' and '2')
        def qc_mask(col):
            if col in out.columns:
                return out[col].astype(str).isin(['1', '2'])
            return pd.Series(True, index=out.index)

        pres_mask = qc_mask(pres_col + '_qc') if pres_col else pd.Series(True, index=out.index)
        temp_mask = qc_mask(temp_col + '_qc') if temp_col else pd.Series(True, index=out.index)
        psal_mask = qc_mask(psal_col + '_qc') if psal_col else pd.Series(True, index=out.index)

        mask_all = pres_mask & temp_mask & psal_mask
        out = out.loc[mask_all].copy()

        # Map to expected generic names
        out['depth'] = out[pres_col].astype(float)          # dbar ≈ m (sufficient for MLD use)
        out['temperature'] = out[temp_col].astype(float)    # °C
        out['salinity'] = out[psal_col].astype(float)       # PSU

        # Ensure lat/lon
        if 'latitude' not in out.columns or 'longitude' not in out.columns:
            raise ValueError("latitude/longitude columns required")

        # Build date_time from JULD if date_time not present
        if 'date_time' not in out.columns:
            if 'juld' in out.columns:
                origin = pd.Timestamp('1950-01-01', tz='UTC')  # Argo JULD origin[web:193][web:209]
                out['date_time'] = origin + pd.to_timedelta(out['juld'].astype(float), unit='D')  # [web:193][web:209][web:214]
            else:
                out['date_time'] = pd.NaT

        # Create profile_id: prefer platform_number + cycle_number if available
        if 'profile_id' not in out.columns:
            if 'platform_number' in out.columns and 'cycle_number' in out.columns:
                out['profile_id'] = out.groupby(['platform_number', 'cycle_number']).ngroup()  # [web:193][web:210]
            else:
                out['profile_id'] = out.groupby(['latitude', 'longitude', 'date_time'], dropna=False).ngroup()

        return out
    # ---------------------------------------------

    def prepare_features(self, df):
        """
        Prepare features for MLD prediction:
        1) Normalize Argo columns → depth/temperature/salinity/date_time/profile_id
        2) Add month/day_of_year
        3) Compute mixed_layer_depth if absent (temperature-threshold method)
        4) Build X, y
        """
        print("[INFO] Preparing features...")
        print(f"[INFO] Available columns (raw): {df.columns.tolist()}")

        # 1) Normalize Argo → generic columns
        df = self.normalize_argo_columns(df)  # <-- integrate here[web:193][web:205][web:172]
        print(f"[INFO] Columns after normalization: {df.columns.tolist()}")

        # 2) Temporal features
        if 'date_time' in df.columns:
            df['date_time'] = pd.to_datetime(df['date_time'], utc=True, errors='coerce')  # [web:204][web:214]
            df = df.sort_values('date_time')
            df['month'] = df['date_time'].dt.month
            df['day_of_year'] = df['date_time'].dt.dayofyear
        else:
            df['month'] = np.nan
            df['day_of_year'] = np.nan

        # 3) Compute MLD if missing
        if 'mixed_layer_depth' not in df.columns:
            print("[INFO] 'mixed_layer_depth' not found. Calculating using temperature threshold...")
            df = self.calculate_mld_simple(df)  # temperature threshold method
            print("[INFO] MLD calculated successfully")

        # 4) Select features
        feature_columns = [
            'temperature', 'salinity', 'latitude', 'longitude',
            'month', 'day_of_year', 'depth'
        ]
        available_features = [c for c in feature_columns if c in df.columns]
        print(f"[INFO] Using features: {available_features}")
        if not available_features:
            raise ValueError("No valid feature columns found after normalization!")

        X = df[available_features].values
        y = df['mixed_layer_depth'].values.reshape(-1, 1)

        mask = ~(np.isnan(X).any(axis=1) | np.isnan(y).any(axis=1))
        X = X[mask]
        y = y[mask]

        print(f"[INFO] Final dataset shape: X={X.shape}, y={y.shape}")
        return X, y

    def calculate_mld_simple(self, df, threshold=0.5, ref_depth=10):
        """
        Simple temperature-threshold MLD:
        depth where |T(z) - T(ref_depth)| > threshold, per profile[web:165][web:167].
        """
        print(f"[INFO] Calculating MLD with temp threshold={threshold}°C, ref_depth={ref_depth}m")
        if 'profile_id' not in df.columns:
            df['profile_id'] = df.groupby(['latitude', 'longitude', 'date_time'], dropna=False).ngroup()

        mld_vals = []
        for pid, grp in df.groupby('profile_id'):
            grp = grp.sort_values('depth')
            depth = grp['depth'].to_numpy()
            temp = grp['temperature'].to_numpy()
            if len(depth) == 0:
                continue
            ref_idx = np.argmin(np.abs(depth - ref_depth))
            temp_ref = temp[ref_idx]
            temp_diff = np.abs(temp - temp_ref)
            idx = np.where(temp_diff > threshold)[0]
            mld = depth[idx[0]] if len(idx) > 0 else depth[-1]
            mld_vals.extend([mld] * len(grp))

        df = df.copy()
        df['mixed_layer_depth'] = mld_vals
        return df

    def create_sequences(self, X, y, time_steps=30):
        print(f"[INFO] Creating sequences with {time_steps} time steps...")
        Xs, ys = [], []
        for i in range(len(X) - time_steps):
            Xs.append(X[i:(i + time_steps)])
            ys.append(y[i + time_steps])
        X_seq = np.array(Xs)
        y_seq = np.array(ys)
        print(f"[INFO] Sequence shape: X_seq={X_seq.shape}, y_seq={y_seq.shape}")
        return X_seq, y_seq

    def build_lstm_model(self, input_shape):
        print("[INFO] Building LSTM model...")
        model = Sequential([
            LSTM(128, return_sequences=True, input_shape=input_shape),
            Dropout(0.2),
            LSTM(64, return_sequences=True),
            Dropout(0.2),
            LSTM(32, return_sequences=False),
            Dropout(0.2),
            Dense(16, activation='relu'),
            Dropout(0.1),
            Dense(1)
        ])
        model.compile(optimizer=keras.optimizers.Adam(learning_rate=0.001),
                      loss='mse', metrics=['mae', 'mse'])
        model.summary()
        return model

    def train(self, X, y, time_steps=30, epochs=100, batch_size=32, validation_split=0.2):
        print("[INFO] Starting training process...")
        X_scaled = self.scaler_X.fit_transform(X)
        y_scaled = self.scaler_y.fit_transform(y)
        X_seq, y_seq = self.create_sequences(X_scaled, y_scaled, time_steps)
        X_train, X_test, y_train, y_test = train_test_split(X_seq, y_seq, test_size=0.2, random_state=42)
        print(f"[INFO] Training set: {X_train.shape[0]} samples")
        print(f"[INFO] Test set: {X_test.shape[0]} samples")
        self.model = self.build_lstm_model(input_shape=(time_steps, X.shape[1]))

        early_stop = EarlyStopping(monitor='val_loss', patience=15, restore_best_weights=True, verbose=1)
        checkpoint = ModelCheckpoint(os.path.join(self.model_save_dir, 'lstm_mld_best.keras'),
                                     monitor='val_loss', save_best_only=True, verbose=1)
        reduce_lr = ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=5, min_lr=1e-5, verbose=1)

        history = self.model.fit(X_train, y_train, validation_split=validation_split,
                                 epochs=epochs, batch_size=batch_size,
                                 callbacks=[early_stop, checkpoint, reduce_lr], verbose=1)

        print("\n[INFO] Evaluating model on test set...")
        _loss, _mae, _mse = self.model.evaluate(X_test, y_test, verbose=0)
        y_pred_scaled = self.model.predict(X_test)
        y_pred = self.scaler_y.inverse_transform(y_pred_scaled)
        y_test_actual = self.scaler_y.inverse_transform(y_test)
        rmse = np.sqrt(mean_squared_error(y_test_actual, y_pred))
        mae = mean_absolute_error(y_test_actual, y_pred)
        print(f"\n[RESULTS] Test MAE: {mae:.4f} m | RMSE: {rmse:.4f} m")
        self.plot_training_history(history)
        return history, (rmse, mae)

    def plot_training_history(self, history):
        plt.figure(figsize=(12, 4))
        plt.subplot(1, 2, 1)
        plt.plot(history.history['loss'], label='Train Loss')
        plt.plot(history.history['val_loss'], label='Val Loss')
        plt.xlabel('Epoch'); plt.ylabel('MSE'); plt.legend(); plt.title('Loss'); plt.grid(True)
        plt.subplot(1, 2, 2)
        plt.plot(history.history['mae'], label='Train MAE')
        plt.plot(history.history['val_mae'], label='Val MAE')
        plt.xlabel('Epoch'); plt.ylabel('MAE'); plt.legend(); plt.title('MAE'); plt.grid(True)
        plt.tight_layout()
        out = os.path.join(self.model_save_dir, 'training_history.png')
        plt.savefig(out); print(f"[INFO] Training history plot saved to {out}"); plt.close()

    def save_model(self, model_name='lstm_mld_model'):
        print("\n[INFO] Saving model and scalers...")
        model_path = os.path.join(self.model_save_dir, f'{model_name}.keras')
        self.model.save(model_path)
        joblib.dump(self.scaler_X, os.path.join(self.model_save_dir, f'{model_name}_scaler_X.pkl'))
        joblib.dump(self.scaler_y, os.path.join(self.model_save_dir, f'{model_name}_scaler_y.pkl'))
        print(f"[INFO] Saved: {model_path}")
        return model_path


import os

model_path = r"D:\Documents\ACADEMIC\BTECH\TY\Sem-I_Mod-V\EDAI-V\OceanFrontRepo\OceanFront\backend\models\lstm_mld_model.keras"
print("Exists?", os.path.exists(model_path))  # must print True
model = keras.models.load_model(model_path)  # loads only if file exists[web:86][web:237]
