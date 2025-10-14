import pandas as pd
import xarray as xr

# Load NetCDF file
# ds = xr.open_dataset("nodc_nodc_R1901605_265.nc", "nodc_nodc_R1901605_265.nc", "nodc_nodc_R1901605_265.nc", "nodc_R1901605_265.nc")
ds = xr.open_dataset("D:\\Documents\\ACADEMIC\\BTECH\\TY\\Sem-I_Mod-V\\EDAI-V\\OceanFrontRepo\\OceanFront\\oceanFrontData\\NetCDF\\nodc_R1901605_265.nc")

print(ds)        # Show dataset structure
print(ds.data_vars)  # See variables inside (TEMP, PSAL, etc.)

# Convert to pandas DataFrame
df = ds.to_dataframe().reset_index()

print(df.head())

df.to_parquet("nodc_nodc_R1901605_265.parquet", engine="pyarrow", index=False)
print("✅ Saved as nodc_R1901605_265.parquet")

df_check = pd.read_parquet("nodc_nodc_R1901605_265.parquet")
print(df_check.head())
