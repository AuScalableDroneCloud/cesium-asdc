This application provides an interface to Cesium, and allows loading of timeseries data as well as webODM data.

Going through State.js we come across the variable indexFile. An index file is required to tell the application where the data in the Public Data section exists. The index file has the following format:
```
{
  "categories":[
    {
      "id":1,
      "name":"CATEGORY_NAME"
    },
    ...
  ],
  "assets":[
    {
      "id": 1,
      "name": "ASSET_NAME",
      "status": "active",
      "categoryID": 1,
      "data": [1, 2, 3]
    },
    ...
  ],
  "datasets":[
    {
      "id": 1,
      "type":"DATA_TYPE",
      "date":"DATA_DATE",
      "url":"DATA_URL",
      ...
    },
    ...
  ]
}
```
Datasets have various types including: "PointCloud", "GeoJSON", "EPTPointCloud", "Model", "Influx", "ImageSeries", "Imagery", "ModelTileset", and "CSV". Each type has different attributes and following the example index file is recommended.

An index file can be passed to the application as a query like ```?index={INDEX_FILE_URL}```, and the application will then ignore the indexFile specified in the State.js file.

Some variables also need to be set in Constants.js, for example eptServer. Please note, there is a modified version, for handling of ASDC cookies, of ept-tools in the ept-tools-mod folder, and the url to this server needs to be set for full functioning local environment.

Also, there is a processingAPI variable which should point to [this](https://github.com/AuScalableDroneCloud/cesium-api) api.
