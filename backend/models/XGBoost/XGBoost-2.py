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
import os

# === 1️⃣ Locate and Load All Parquet Files ===
data_path = (
    # "D:/Documents/ACADEMIC/BTECH/TY/Sem-I_Mod-V/EDAI-V/OceanFront/OceanFrontData/"
    "D:\\Documents\\ACADEMIC\\BTECH\\TY\\Sem-I_Mod-V\\EDAI-V\\OceanFrontRepo\\OceanFront\\oceanFrontData\\Parquet\\"
)
parquet_files = glob.glob(os.path.join(data_path, "*.parquet"))

print(f"Found {len(parquet_files)} Parquet files.")
if not parquet_files:
    raise FileNotFoundError("❌ No Parquet files found. Check the path above.")

# Load all files safely
df_list = []
for f in parquet_files:
    try:
        df_list.append(pd.read_parquet(f))
        print(f"  ✅ Loaded: {os.path.basename(f)}")
    except Exception as e:
        print(f"  ⚠️ Skipped {os.path.basename(f)} (Error: {e})")

df = pd.concat(df_list, ignore_index=True)
print("✅ Data loaded. Shape:", df.shape)

# === 2️⃣ Basic Cleaning and Feature Selection ===
cols_of_interest = [
    "latitude", "longitude", "juld", "pres_adjusted",
    "psal_adjusted", "temp_adjusted", "data_mode",
    "platform_type", "vertical_sampling_scheme",
    "profile_pres_qc", "profile_temp_qc"
]

df = df[[c for c in cols_of_interest if c in df.columns]].copy()

# Drop missing temperature rows
df = df.dropna(subset=["temp_adjusted"])
print("✅ Cleaned data. Remaining:", df.shape)

# === 3️⃣ Convert Datetime Columns to Numeric ===
if "juld" in df.columns:
    df["juld"] = pd.to_datetime(df["juld"], errors="coerce")
    df["juld_numeric"] = (df["juld"] - df["juld"].min()).dt.total_seconds() / 86400.0
    df = df.drop(columns=["juld"])
    df = df.rename(columns={"juld_numeric": "juld"})
    print("✅ Converted 'juld' to numeric (days since start).")

# === 4️⃣ Encode Categorical Columns ===
categorical_cols = [
    "data_mode", "platform_type", "vertical_sampling_scheme",
    "profile_pres_qc", "profile_temp_qc"
]
df = pd.get_dummies(df, columns=[c for c in categorical_cols if c in df.columns], drop_first=True)

# # === 5️⃣ Define Features (X) and Target (y) ===
# X = df.drop(columns=["temp_adjusted"])
# y = df["temp_adjusted"]

# === 5️⃣ Define Features (X) and Target (y) ===
X = df.drop(columns=["temp_adjusted"])
y = df["temp_adjusted"]

# === 🧹 Clean column names ===
X.columns = (
    X.columns
    .str.replace(r"[\[\]<>]", "", regex=True)
    .str.replace(r"\s+", "_", regex=True)
)
print("✅ Cleaned column names for XGBoost compatibility.")

# === 6️⃣ Split Data ===
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# === 7️⃣ Train XGBoost Model ===
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

# === 8️⃣ Evaluate Model ===
y_pred = model.predict(X_test)
mse = mean_squared_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)

print("\n📊 Model Performance:")
print(f"   MSE  = {mse:.4f}")
print(f"   RMSE = {np.sqrt(mse):.4f}")
print(f"   R²   = {r2:.4f}")

# === 9️⃣ Save Model ===
joblib.dump(model, "OceanFront_XGBoost_Tz.pkl")
print("\n✅ Model saved as OceanFront_XGBoost_Tz.pkl")

# Save features for later inference
joblib.dump(X.columns.tolist(), "OceanFront_XGBoost_Tz_features.pkl")
print("✅ Saved feature column list for future predictions.")
