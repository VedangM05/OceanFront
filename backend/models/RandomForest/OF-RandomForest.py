import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score
import joblib

# 1. Load dataset
df = pd.read_csv("D:\\Documents\\ACADEMIC\\BTECH\\TY\\Sem-I_Mod-V\\EDAI-V\\OceanFront\\OF-Data\\202009.csv", sep=",", engine="python")

# Clean column names
df.columns = df.columns.str.strip()

print("Columns available:", df.columns.tolist())  # Debug check

# Define features/target
features = ['latitude_min', 'latitude_max', 'longitude_min', 'longitude_max', 'depth_min']
target = 'depth_max'

X = df[features]
y = df[target]

# 2. Train-test split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 3. Train Random Forest model
rf = RandomForestRegressor(n_estimators=200, random_state=42)
rf.fit(X_train, y_train)

# 4. Evaluate model
y_pred = rf.predict(X_test)
mse = mean_squared_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)

print("Model Performance:")
print(f"MSE: {mse:.4f}")
print(f"R²: {r2:.4f}")

# 5. Get user input and make prediction
print("\nEnter values for depth prediction:")
latitude_min = float(input("Latitude Min: "))
latitude_max = float(input("Latitude Max: "))
longitude_min = float(input("Longitude Min: "))
longitude_max = float(input("Longitude Max: "))
depth_min = float(input("Depth Min: "))

# Create input array for prediction
user_input = [[latitude_min, latitude_max, longitude_min, longitude_max, depth_min]]

# Make prediction
predicted_depth = rf.predict(user_input)

print(f"\nPredicted Maximum Depth: {predicted_depth[0]:.2f} meters")
print(f"Model Accuracy (R²): {r2:.4f}")
