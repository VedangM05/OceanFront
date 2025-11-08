# -------------------------------------------------------------
#  OceanFront: Predicting Temperature Profile (Tz) with XGBoost
# -------------------------------------------------------------
import pandas as pd
import glob
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
from xgboost import XGBRegressor
import joblib

# === 1️⃣ Load All Parquet Files ===
# Adjust path if needed
parquet_files = glob.glob("D:\\Documents\\ACADEMIC\\BTECH\\TY\\Sem-I_Mod-V\\EDAI-V\\OceanFrontRepo\\OceanFront\\oceanFrontData\\Parquet\\*.parquet")
print(f"Found {len(parquet_files)} Parquet files.")

df_list = [pd.read_parquet(file) for file in parquet_files]
df = pd.concat(df_list, ignore_index=True)
print("✅ Data loaded. Shape:", df.shape)

# === 2️⃣ Basic Cleaning and Feature Selection ===
# Keep only numeric + key categorical columns
cols_of_interest = [
    "latitude", "longitude", "juld", "pres_adjusted",
    "psal_adjusted", "temp_adjusted", "data_mode", "platform_type",
    "vertical_sampling_scheme", "profile_pres_qc", "profile_temp_qc"
]

df = df[cols_of_interest].copy()

# Drop rows where target (temp_adjusted) is missing
df = df.dropna(subset=["temp_adjusted"])
print("✅ Cleaned data. Remaining:", df.shape)

# === 3️⃣ Encode Categorical Columns ===
categorical_cols = ["data_mode", "platform_type", "vertical_sampling_scheme",
                    "profile_pres_qc", "profile_temp_qc"]

df = pd.get_dummies(df, columns=categorical_cols, drop_first=True)

# === 4️⃣ Define Features (X) and Target (y) ===
X = df.drop(columns=["temp_adjusted"])
y = df["temp_adjusted"]

# === 5️⃣ Train-Test Split ===
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# === 6️⃣ Initialize and Train XGBoost Regressor ===
model = XGBRegressor(
    n_estimators=300,
    learning_rate=0.05,
    max_depth=6,
    subsample=0.8,
    colsample_bytree=0.8,
    random_state=42,
    n_jobs=-1
)

print("🚀 Training XGBoost model...")
model.fit(X_train, y_train)
print("✅ Training complete.")

# === 7️⃣ Evaluate Model ===
y_pred = model.predict(X_test)
mse = mean_squared_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)

print("\n📊 Model Performance:")
print(f"   MSE  = {mse:.4f}")
print(f"   RMSE = {np.sqrt(mse):.4f}")
print(f"   R²   = {r2:.4f}")

# === 8️⃣ Save Model ===
joblib.dump(model, "OceanFront_XGBoost_Tz.pkl")
print("\n✅ Model saved as OceanFront_XGBoost_Tz.pkl")

# === 9️⃣ Optional: Save Feature Columns for Later Inference ===
joblib.dump(X.columns.tolist(), "OceanFront_XGBoost_Tz_features.pkl")
print("✅ Saved feature column list for future predictions.")