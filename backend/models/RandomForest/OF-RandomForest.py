import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score
import joblib

# # 1. Load dataset
# df=pd.read_csv("D:\\Documents\\ACADEMIC\\BTECH\\TY\\Sem-I_Mod-V\\EDAI-V\\OceanFront\\OF-Data\\202009.csv", sep=",", engine="python")


# # 2. Select features and target
# features = ["latitude_min", "latitude_max", "longitude_min", "longitude_max", "depth_min"]
# target = "depth_max"

# X = df[features]
# y = df[target]

# After loading
df = pd.read_csv("D:\\Documents\\ACADEMIC\\BTECH\\TY\\Sem-I_Mod-V\\EDAI-V\\OceanFront\\OF-Data\\202009.csv", sep=",", engine="python")

# Clean column names
df.columns = df.columns.str.strip()

print("Columns available:", df.columns.tolist())  # Debug check

# Define features/target
features = ['latitude_min', 'latitude_max', 'longitude_min', 'longitude_max', 'depth_min']
target = 'depth_max'

X = df[features]
y = df[target]

# 3. Train-test split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 4. Train Random Forest model
rf = RandomForestRegressor(n_estimators=200, random_state=42)
rf.fit(X_train, y_train)

# 5. Evaluate
y_pred = rf.predict(X_test)
print("MSE:", mean_squared_error(y_test, y_pred))
print("R²:", r2_score(y_test, y_pred))

# 6. Save model
# joblib.dump(rf, "oceanfront_random_forest.pkl")
# print("✅ Model saved as oceanfront_random_forest.pkl")