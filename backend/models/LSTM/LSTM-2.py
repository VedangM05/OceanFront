"""
LSTM Model Training for Mixed Layer Depth Prediction
- Loads multiple Parquet files
- Normalizes Argo schema (pres/temp/psal → depth/temperature/salinity)
- Computes Mixed Layer Depth (temperature-threshold method)
- Trains an LSTM
- Exports model (.keras) and scalers
- Optionally reloads the model to verify
"""

# import os
# import glob
# import numpy as np
# import pandas as pd
# from sklearn.preprocessing import MinMaxScaler
# from sklearn.model_selection import train_test_split
# from sklearn.metrics import mean_squared_error, mean_absolute_error
# import matplotlib.pyplot as plt
# import joblib
# import tensorflow as tf
# from tensorflow import keras
# from tensorflow.keras.models import Sequential
# from tensorflow.keras.layers import LSTM, Dense, Dropout
# from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau

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

# Reproducibility
np.random.seed(42)
tf.random.set_seed(42)


class MLDPredictor:
    def __init__(self, parquet_dir: str, model_save_dir: str):
        self.parquet_dir = parquet_dir
        self.model_save_dir = model_save_dir
        self.model = None
        self.scaler_X = MinMaxScaler()
        self.scaler_y = MinMaxScaler()
        os.makedirs(self.model_save_dir, exist_ok=True)

    # ---------- I/O ----------
    def load_multiple_parquet_files(self) -> pd.DataFrame:
        print("[INFO] Loading Parquet files...")
        parquet_files = glob.glob(os.path.join(self.parquet_dir, "*.parquet"))
        print(f"[INFO] Found {len(parquet_files)} Parquet files")
        if not parquet_files:
            raise ValueError(f"No Parquet files found in {self.parquet_dir}")
        dfs = []
        for fp in parquet_files:
            try:
                df = pd.read_parquet(fp)
                dfs.append(df)
                print(f"[INFO] Loaded {fp}: {len(df)} rows")
            except Exception as e:
                print(f"[WARNING] Could not load {fp}: {e}")
        combined = pd.concat(dfs, ignore_index=True)
        print(f"[INFO] Total rows after combining: {len(combined)}")
        return combined

    # ---------- Argo normalization ----------
    # def normalize_argo_columns(self, df: pd.DataFrame) -> pd.DataFrame:
    #     """
    #     Map Argo vars to generic names and build date_time/profile_id.
    #     Uses *_adjusted columns if available; applies QC if present.
    #     """
    #     pres_col = "pres_adjusted" if "pres_adjusted" in df.columns else ("pres" if "pres" in df.columns else None)
    #     temp_col = "temp_adjusted" if "temp_adjusted" in df.columns else ("temp" if "temp" in df.columns else None)
    #     psal_col = "psal_adjusted" if "psal_adjusted" in df.columns else ("psal" if "psal" in df.columns else None)

    #     if not all([pres_col, temp_col, psal_col]):
    #         missing = []
    #         if pres_col is None: missing.append("pres/pres_adjusted")
    #         if temp_col is None: missing.append("temp/temp_adjusted")
    #         if psal_col is None: missing.append("psal/psal_adjusted")
    #         raise ValueError(f"Argo variables missing: {missing}")

    #     out = df.copy()

    #     def qc_mask(col):
    #         if col in out.columns:
    #             return out[col].astype(str).isin(["1", "2"])
    #         return pd.Series(True, index=out.index)

    #     mask = qc_mask(pres_col + "_qc") & qc_mask(temp_col + "_qc") & qc_mask(psal_col + "_qc")
    #     out = out.loc[mask].copy()

    #     out["depth"] = out[pres_col].astype(float)           # dbar ~ m
    #     out["temperature"] = out[temp_col].astype(float)     # °C
    #     out["salinity"] = out[psal_col].astype(float)        # PSU

    #     if "latitude" not in out.columns or "longitude" not in out.columns:
    #         raise ValueError("latitude/longitude columns required")

    #     if "date_time" not in out.columns:
    #         if "juld" in out.columns:
    #             origin = pd.Timestamp("1950-01-01", tz="UTC")
    #             out["date_time"] = origin + pd.to_timedelta(out["juld"].astype(float), unit="D")
    #         else:
    #             out["date_time"] = pd.NaT

    #     if "profile_id" not in out.columns:
    #         if "platform_number" in out.columns and "cycle_number" in out.columns:
    #             out["profile_id"] = out.groupby(["platform_number", "cycle_number"]).ngroup()
    #         else:
    #             out["profile_id"] = out.groupby(["latitude", "longitude", "date_time"], dropna=False).ngroup()

    #     return out

    def normalize_argo_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Map Argo vars to generic names and build date_time/profile_id.
        Uses *_adjusted columns if available; applies QC if present.
        Robust JULD handling: supports numeric days-since-1950, strings, or datetime-like.
        """
        pres_col = "pres_adjusted" if "pres_adjusted" in df.columns else ("pres" if "pres" in df.columns else None)
        temp_col = "temp_adjusted" if "temp_adjusted" in df.columns else ("temp" if "temp" in df.columns else None)
        psal_col = "psal_adjusted" if "psal_adjusted" in df.columns else ("psal" if "psal" in df.columns else None)

        if not all([pres_col, temp_col, psal_col]):
            missing = []
            if pres_col is None: missing.append("pres/pres_adjusted")
            if temp_col is None: missing.append("temp/temp_adjusted")
            if psal_col is None: missing.append("psal/psal_adjusted")
            raise ValueError(f"Argo variables missing: {missing}")

        out = df.copy()

        # QC filter (keep flags '1' or '2' when present)
        def qc_mask(col):
            if col in out.columns:
                return out[col].astype(str).isin(["1", "2"])
            return pd.Series(True, index=out.index)

        mask = qc_mask(pres_col + "_qc") & qc_mask(temp_col + "_qc") & qc_mask(psal_col + "_qc")
        out = out.loc[mask].copy()

        # Map to expected names
        out["depth"] = pd.to_numeric(out[pres_col], errors="coerce").astype(float)      # dbar ~ m
        out["temperature"] = pd.to_numeric(out[temp_col], errors="coerce").astype(float)
        out["salinity"] = pd.to_numeric(out[psal_col], errors="coerce").astype(float)

        if "latitude" not in out.columns or "longitude" not in out.columns:
            raise ValueError("latitude/longitude columns required")

        # Robust JULD → date_time
        if "date_time" not in out.columns:
            if "juld" in out.columns:
                j = out["juld"]
                origin = pd.Timestamp("1950-01-01", tz="UTC")

                # Case A: already datetime-like (from Parquet schema)
                if pd.api.types.is_datetime64_any_dtype(j) or pd.api.types.is_datetime64tz_dtype(j):
                    out["date_time"] = pd.to_datetime(j, utc=True, errors="coerce")

                else:
                    # Try numeric days since 1950
                    j_num = pd.to_numeric(j, errors="coerce")
                    if j_num.notna().any() and j_num.astype("float64").notna().any():
                        out["date_time"] = origin + pd.to_timedelta(j_num.astype(float), unit="D")
                    else:
                        # Try parse as datetime strings directly
                        out["date_time"] = pd.to_datetime(j, utc=True, errors="coerce")
            else:
                out["date_time"] = pd.NaT

        # Ensure timezone-aware UTC
        out["date_time"] = pd.to_datetime(out["date_time"], utc=True, errors="coerce")

        # Build profile_id
        if "profile_id" not in out.columns:
            if "platform_number" in out.columns and "cycle_number" in out.columns:
                out["profile_id"] = out.groupby(["platform_number", "cycle_number"]).ngroup()
            else:
                out["profile_id"] = out.groupby(["latitude", "longitude", "date_time"], dropna=False).ngroup()

        return out


    # ---------- Feature building ----------
    def calculate_mld_simple(self, df: pd.DataFrame, threshold: float = 0.5, ref_depth: float = 10.0) -> pd.DataFrame:
        """
        Temperature-threshold MLD per profile:
        MLD = first depth where |T(z) - T(ref_depth)| > threshold, else max depth.
        """
        print(f"[INFO] Calculating MLD (ΔT>{threshold}°C from {ref_depth} m)")
        if "profile_id" not in df.columns:
            df["profile_id"] = df.groupby(["latitude", "longitude", "date_time"], dropna=False).ngroup()

        mld_vals = []
        for _, grp in df.groupby("profile_id"):
            g = grp.sort_values("depth")
            depth = g["depth"].to_numpy()
            temp = g["temperature"].to_numpy()
            if depth.size == 0:
                continue
            ref_idx = int(np.argmin(np.abs(depth - ref_depth)))
            t_ref = temp[ref_idx]
            diff = np.abs(temp - t_ref)
            idx = np.where(diff > threshold)[0]
            mld = depth[idx[0]] if idx.size > 0 else depth[-1]
            mld_vals.extend([mld] * len(g))

        df = df.copy()
        df["mixed_layer_depth"] = mld_vals
        return df

    def prepare_features(self, df: pd.DataFrame):
        print("[INFO] Preparing features...")
        print(f"[INFO] Raw columns: {df.columns.tolist()}")

        df = self.normalize_argo_columns(df)
        print(f"[INFO] Columns after normalization: {df.columns.tolist()}")

        if "date_time" in df.columns:
            df["date_time"] = pd.to_datetime(df["date_time"], utc=True, errors="coerce")
            df = df.sort_values("date_time")
            df["month"] = df["date_time"].dt.month
            df["day_of_year"] = df["date_time"].dt.dayofyear
        else:
            df["month"] = np.nan
            df["day_of_year"] = np.nan

        if "mixed_layer_depth" not in df.columns:
            df = self.calculate_mld_simple(df)

        feature_cols = ["temperature", "salinity", "latitude", "longitude", "month", "day_of_year", "depth"]
        used = [c for c in feature_cols if c in df.columns]
        print(f"[INFO] Using features: {used}")
        if not used:
            raise ValueError("No valid feature columns found after normalization")

        X = df[used].to_numpy()
        y = df["mixed_layer_depth"].to_numpy().reshape(-1, 1)

        mask = ~(np.isnan(X).any(axis=1) | np.isnan(y).any(axis=1))
        X, y = X[mask], y[mask]
        print(f"[INFO] Final dataset: X={X.shape}, y={y.shape}")
        return X, y

    # ---------- Model ----------
    def build_lstm_model(self, input_shape):
        print("[INFO] Building LSTM model...")
        model = Sequential([
            LSTM(128, return_sequences=True, input_shape=input_shape),
            Dropout(0.2),
            LSTM(64, return_sequences=True),
            Dropout(0.2),
            LSTM(32),
            Dropout(0.2),
            Dense(16, activation="relu"),
            Dropout(0.1),
            Dense(1)
        ])
        model.compile(optimizer=keras.optimizers.Adam(1e-3), loss="mse", metrics=["mae", "mse"])
        model.summary()
        return model

    def create_sequences(self, X, y, time_steps=30):
        Xs, ys = [], []
        for i in range(len(X) - time_steps):
            Xs.append(X[i:i+time_steps])
            ys.append(y[i+time_steps])
        Xs = np.asarray(Xs)
        ys = np.asarray(ys)
        print(f"[INFO] Sequence shapes: X={Xs.shape}, y={ys.shape}")
        return Xs, ys

    def train(self, X, y, time_steps=30, epochs=50, batch_size=32, validation_split=0.2):
        print("[INFO] Starting training...")
        Xs = self.scaler_X.fit_transform(X)
        ys = self.scaler_y.fit_transform(y)
        X_seq, y_seq = self.create_sequences(Xs, ys, time_steps)
        X_tr, X_te, y_tr, y_te = train_test_split(X_seq, y_seq, test_size=0.2, random_state=42)

        self.model = self.build_lstm_model((time_steps, X.shape[1]))

        ckpt_path = os.path.join(self.model_save_dir, "lstm_mld_best.keras")
        callbacks = [
            EarlyStopping(monitor="val_loss", patience=12, restore_best_weights=True, verbose=1),
            ModelCheckpoint(ckpt_path, monitor="val_loss", save_best_only=True, verbose=1),
            ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=5, min_lr=1e-5, verbose=1)
        ]

        history = self.model.fit(
            X_tr, y_tr,
            validation_split=validation_split,
            epochs=epochs,
            batch_size=batch_size,
            callbacks=callbacks,
            verbose=1
        )

        # Evaluate
        loss, mae, mse = self.model.evaluate(X_te, y_te, verbose=0)
        y_pred_scaled = self.model.predict(X_te, verbose=0)
        y_pred = self.scaler_y.inverse_transform(y_pred_scaled)
        y_true = self.scaler_y.inverse_transform(y_te)
        rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
        mae_ = float(mean_absolute_error(y_true, y_pred))
        print(f"[RESULTS] Test MAE: {mae_:.3f} m  |  RMSE: {rmse:.3f} m")

        self._plot_history(history)
        return history, (rmse, mae_)

    def _plot_history(self, history):
        plt.figure(figsize=(12, 4))
        plt.subplot(1, 2, 1)
        plt.plot(history.history["loss"], label="train")
        plt.plot(history.history["val_loss"], label="val")
        plt.title("Loss (MSE)"); plt.legend(); plt.grid(True)
        plt.subplot(1, 2, 2)
        plt.plot(history.history["mae"], label="train")
        plt.plot(history.history["val_mae"], label="val")
        plt.title("MAE"); plt.legend(); plt.grid(True)
        out = os.path.join(self.model_save_dir, "training_history.png")
        plt.tight_layout(); plt.savefig(out); plt.close()
        print(f"[INFO] Training plot saved to {out}")

    # ---------- Save / Load ----------
    def save_model(self, model_name="lstm_mld_model"):
        path = os.path.join(self.model_save_dir, f"{model_name}.keras")
        self.model.save(path)  # Keras v3 format
        joblib.dump(self.scaler_X, os.path.join(self.model_save_dir, f"{model_name}_scaler_X.pkl"))
        joblib.dump(self.scaler_y, os.path.join(self.model_save_dir, f"{model_name}_scaler_Y.pkl"))
        print(f"[INFO] Saved model to {path}")
        return path

    @staticmethod
    def load_model(model_path: str):
        if not os.path.isfile(model_path):
            raise FileNotFoundError(f"No file at {model_path}")
        model = keras.models.load_model(model_path)  # .keras or .h5
        return model


def main():
    # --------- PATHS: adjust for your machine ---------
    PARQUET_DIR = r"D:\Documents\ACADEMIC\BTECH\TY\Sem-I_Mod-V\EDAI-V\OceanFrontRepo\OceanFront\oceanFrontData\Parquet"
    MODEL_SAVE_DIR = r"D:\Documents\ACADEMIC\BTECH\TY\Sem-I_Mod-V\EDAI-V\OceanFrontRepo\OceanFront\backend\models"
    # --------------------------------------------------

    TIME_STEPS = 30
    EPOCHS = 60
    BATCH_SIZE = 32

    print("=" * 72)
    print("LSTM Mixed Layer Depth Prediction - Training Pipeline")
    print("=" * 72)
    print("CWD:", os.getcwd())
    print("PARQUET_DIR:", PARQUET_DIR)
    print("MODEL_SAVE_DIR:", MODEL_SAVE_DIR)

    predictor = MLDPredictor(PARQUET_DIR, MODEL_SAVE_DIR)

    # Train
    df = predictor.load_multiple_parquet_files()
    X, Y = predictor.prepare_features(df)
    _, metrics = predictor.train(X, Y, time_steps=TIME_STEPS, epochs=EPOCHS, batch_size=BATCH_SIZE)

    # Save
    saved_path = predictor.save_model("lstm_mld_model")
    print("Saved:", saved_path)
    print("Metrics (RMSE, MAE):", metrics)

    # Optional: verify load
    reloaded = MLDPredictor.load_model(saved_path)
    reloaded.summary()


if __name__ == "__main__":
    main()
