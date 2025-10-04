import pandas as pd
import xarray as xr

# Load NetCDF file
ds = xr.open_dataset("nodc_R3901528_118.nc")

print(ds)        # Show dataset structure
print(ds.data_vars)  # See variables inside (TEMP, PSAL, etc.)

# Convert to pandas DataFrame
df = ds.to_dataframe().reset_index()

print(df.head())

df.to_parquet("202009_prof.parquet", engine="pyarrow", index=False)
print("✅ Saved as nodc_R3901528_118.parquet")

df_check = pd.read_parquet("nodc_R3901528_118.parquet")
print(df_check.head())
