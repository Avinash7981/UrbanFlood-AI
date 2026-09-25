import sys
import os
import numpy as np
from osgeo import gdal

def main():
    input_tif = "External DATA/cdne44m_v3r1/cdne44m.tif"
    output_tif = "rgb_dem.tif"

    if not os.path.exists(input_tif):
        print(f"Error: {input_tif} not found")
        sys.exit(1)

    dataset = gdal.Open(input_tif, gdal.GA_ReadOnly)
    band = dataset.GetRasterBand(1)
    
    # Read elevation data
    elevation = band.ReadAsArray().astype(np.float32)
    
    # Mapbox Terrain-RGB formula:
    # height = -10000 + ((R * 256 * 256 + G * 256 + B) * 0.1)
    # val = (height + 10000) * 10
    
    val = np.round((elevation + 10000) * 10).astype(np.int32)
    
    # Clip to valid ranges just in case
    val = np.clip(val, 0, 16777215)
    
    r = (val // 65536).astype(np.uint8)
    g = ((val % 65536) // 256).astype(np.uint8)
    b = (val % 256).astype(np.uint8)
    
    driver = gdal.GetDriverByName("GTiff")
    out_dataset = driver.Create(output_tif, dataset.RasterXSize, dataset.RasterYSize, 3, gdal.GDT_Byte, options=['COMPRESS=LZW', 'TILED=YES'])
    
    out_dataset.SetGeoTransform(dataset.GetGeoTransform())
    out_dataset.SetProjection(dataset.GetProjection())
    
    out_dataset.GetRasterBand(1).WriteArray(r)
    out_dataset.GetRasterBand(2).WriteArray(g)
    out_dataset.GetRasterBand(3).WriteArray(b)
    
    out_dataset.FlushCache()
    out_dataset = None
    dataset = None
    
    print(f"Successfully created {output_tif}")

if __name__ == "__main__":
    main()
