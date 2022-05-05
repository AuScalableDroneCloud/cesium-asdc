import {
  selectedAssetIDs,
  setSelectedAssetIDs,
  selectedDatasets,
  tilesets,
  entities,
  dataSources,
  viewer,
  MSSE,
  setMSSE,
  timelineTracks,
  datasets,
  selectedDimension,
  imageryLayers,
  billboard,
  setAssets,
  setDatasets,
  setCategories,
  setInitVars,
  assets,
  setODMProjects,
  publicTask,
  selectedData,
  setTaskInfos,
  indexFile,
  sourceDivs,
  setSelectedDatasets,
  markersDataSource
} from "./State.js";
import { loadInfluxGraphs, loadCSVGraphs,closeGraphModal } from "./Graphs.js";
import { setupStyleToolbar, applyStyle } from "./Style.js";
import { highlightHeightPX, highlightColor, eptServer } from "./Constants.js";

export const loadAsset = (asset, timeline, timelineTrack) => {
  if (!asset) return;

  var assetDataset = [];
  asset.data?.map((dataID) => {
    for (var i = 0; i < datasets.length; i++) {
      if (datasets[i].id === dataID) {
        assetDataset.push(datasets[i]);
        loadData(asset, datasets[i], false, false, true);
        break;
      }
    }
  });

  syncTimeline(false);

  var assetDates = assetDataset.map(data=>{
    return new Date(data.date)
  });

  assetDates.sort(function (a, b) {
    return new Date(a).getTime() - new Date(b).getTime();
  });

  viewer.clock.currentTime = new Cesium.JulianDate.fromDate(
    new Date(assetDates[0])
  );

  if (assetDataset[0]["type"] === "Influx" || assetDataset[0]["type"]==="ImageSeries") {//todo: clean with function params
    //Influx charts and Image Series from 2 weeks before
    if (assetDataset[0].endDateTime){
      var initialDate = new Date(assetDataset[0].endDateTime);
      viewer.clock.currentTime = new Cesium.JulianDate.fromDate(initialDate);
      viewer.timeline.updateFromClock();
      viewer.timeline.zoomTo(
        Cesium.JulianDate.fromDate(
          new Date(initialDate.getTime() - 2 * 7 * 86400000)
        ),
        Cesium.JulianDate.fromDate(initialDate)
      );
    } else {
      var currentDate = new Date();
      viewer.clock.currentTime = new Cesium.JulianDate.fromDate(currentDate);
      viewer.timeline.updateFromClock();
      viewer.timeline.zoomTo(
        Cesium.JulianDate.fromDate(
          new Date(currentDate.getTime() - 2 * 7 * 86400000)
          // new Date(currentDate.getTime() + 86400000)
        ),
        Cesium.JulianDate.fromDate(new Date())
      );
    }
  } else if (assetDataset[0]["type"] === "CSV") {
    if (assetDataset[0].endDateTime){
      if (assetDataset[0].startDateTime){
        viewer.clock.currentTime = new Cesium.JulianDate.fromDate(new Date(assetDataset[0].endDateTime));
        viewer.timeline.updateFromClock();
        viewer.timeline.zoomTo(
          Cesium.JulianDate.fromDate(
            new Date(assetDataset[0].startDateTime)
          ),
          Cesium.JulianDate.fromDate(new Date(assetDataset[0].endDateTime))
        );
      } else {
        var initialDate = new Date(assetDataset[0].endDateTime);
        viewer.clock.currentTime = new Cesium.JulianDate.fromDate(initialDate);
        viewer.timeline.updateFromClock();
        viewer.timeline.zoomTo(
          Cesium.JulianDate.fromDate(
            new Date(initialDate.getTime() - 2 * 7 * 86400000)
          ),
          Cesium.JulianDate.fromDate(initialDate)
        );
      }
    } else {
      var currentDate = new Date();
      viewer.clock.currentTime = new Cesium.JulianDate.fromDate(currentDate);
      viewer.timeline.updateFromClock();
      viewer.timeline.zoomTo(
        Cesium.JulianDate.fromDate(
          new Date(currentDate.getTime() - 2 * 7 * 86400000)
          // new Date(currentDate.getTime() + 86400000)
        ),
        Cesium.JulianDate.fromDate(new Date())
      );
    }
  }
  if (timeline) { 
    var data = assetDataset[0];
    var date = new Date(data.date);
    viewer.timeline._highlightRanges = [];
    viewer.timeline._makeTics();
    if (data.type == "PointCloud" ||
      data.type == "EPTPointCloud" ||
      data.type == "ModelTileset" ||
      data.type == "Imagery"||
      data.type == "GeoJSON"
      ){
      if (date.toString() !== "Invalid Date") {
    // if (tilesets[asset["id"]]) {
      //TODO: dates for entities
        viewer.timeline._highlightRanges = [];
        assetDates.map((date) => {
          viewer.timeline
            .addHighlightRange(highlightColor, highlightHeightPX)
            .setRange(
              Cesium.JulianDate.fromDate(new Date(date)),
              Cesium.JulianDate.fromDate(
                new Date(new Date(date).getTime() + 86400000)
              )
            );
        });

        var minDate = new Date(assetDates[0]);
        var maxDate = new Date(assetDates[assetDates.length - 1]);

        if (
          minDate.toString() !== "Invalid Date" &&
          maxDate.toString() !== "Invalid Date"
        ) {
          viewer.clock.currentTime = new Cesium.JulianDate.fromDate(minDate);
          viewer.timeline.updateFromClock();
          viewer.timeline.zoomTo(
            Cesium.JulianDate.fromDate(minDate),
            Cesium.JulianDate.fromDate(new Date(maxDate.getTime() + 86400000))
          );
        } else {
          //point clouds with no date
          // var currentDate = new Date();
          // viewer.clock.currentTime = new Cesium.JulianDate.fromDate(
          //     new Date()
          // );
          // viewer.timeline.updateFromClock();
          // viewer.timeline.zoomTo(
          //     Cesium.JulianDate.fromDate(currentDate),
          //     Cesium.JulianDate.fromDate(
          //         new Date(currentDate.getTime() + 86400000)
          //     )
          // );
        }
      } else {
        //Other data types with no date
        // var currentDate = new Date();
        // viewer.clock.currentTime = new Cesium.JulianDate.fromDate(
        //     new Date()
        // );
        // viewer.timeline.updateFromClock();
        // viewer.timeline.zoomTo(
        //     Cesium.JulianDate.fromDate(currentDate),
        //     Cesium.JulianDate.fromDate(
        //         new Date(currentDate.getTime() + 86400000)
        //     )
        // );
      }
    }
  }

  if (assetDataset.length > 0) {
    if (assetDataset[0].zoom){
      var zoom = assetDataset[0].zoom;
      viewer.camera.flyTo({
        destination:new Cesium.Cartesian3(
          zoom.position.x,
          zoom.position.y,
          zoom.position.z),
        orientation : {
          direction : new Cesium.Cartesian3(
            zoom.orientation.direction.x,
            zoom.orientation.direction.y,
            zoom.orientation.direction.z
          ),
          up: new Cesium.Cartesian3(
            zoom.orientation.up.x,
            zoom.orientation.up.y,
            zoom.orientation.up.z
          )
        }
      })
    } else {
      // if (
      //   assetDataset[0]["type"] === "PointCloud" ||
      //   assetDataset[0]["type"] === "EPTPointCloud" ||
      //   assetDataset[0]["type"] === "ModelTileset"
      // ) {
      //   document.getElementById("msse-slider-row").style.display = "table-row";
      // } else {
      //   document.getElementById("msse-slider-row").style.display = "none";
      // }

      if (
        assetDataset[0]["type"] === "PointCloud" ||
        assetDataset[0]["type"] === "EPTPointCloud" ||
        assetDataset[0]["type"] === "ModelTileset"
      ) {
        if (assetDataset[0].position && assetDataset[0].boundingSphereRadius){
          var pos = Cesium.Cartographic.toCartesian(
            Cesium.Cartographic.fromDegrees(
              assetDataset[0].position["lng"],
              assetDataset[0].position["lat"],
              assetDataset[0].position["height"]
            )
          );
          viewer.camera.flyToBoundingSphere(
            new Cesium.BoundingSphere(pos, assetDataset[0].boundingSphereRadius)
          );
        } else {
          viewer.flyTo(tilesets[assetDataset[0].asset.id][assetDataset[0].id])
        }
      } else if (assetDataset[0]["type"] === "Model") {
        viewer.flyTo(entities[asset["id"]][assetDataset[0]["id"]]);
      } else if (
        assetDataset[0]["type"] === "Influx" ||
        // assetDataset[0]["type"] === "ImageSeries" ||
        assetDataset[0]["type"] === "CSV"
      ) {
        var position = Cesium.Cartesian3.fromDegrees(
          assetDataset[0]["position"]["lng"],
          assetDataset[0]["position"]["lat"],
          assetDataset[0]["position"]["height"] ? assetDataset[0]["position"]["height"] + 1750 : 1750
        );

        viewer.camera.flyTo({ destination: position });
      } else if (assetDataset[0]["type"] === "ImageSeries") {
        if (entities[asset.id][
          assetDataset[0].id
        ]){
          Cesium.sampleTerrainMostDetailed(
            viewer.terrainProvider,
            Cesium.Ellipsoid.WGS84.cartesianArrayToCartographicArray(
                entities[asset.id][
                  assetDataset[0].id
                ].polygon.hierarchy.getValue().positions
            )
          ).then((updatedPositions) => {
            viewer.camera.flyToBoundingSphere(
              Cesium.BoundingSphere.fromPoints(
                Cesium.Ellipsoid.WGS84.cartographicArrayToCartesianArray(
                  updatedPositions
                )
              ),
              {
                offset: new Cesium.HeadingPitchRange(
                  entities[asset.id][assetDataset[0].id].polygon.stRotation,
                  Cesium.Math.toRadians(-90),
                  0)
              }
            );
          });
        }
      } else if (assetDataset[0]["type"] === "Imagery") {
        var data = assetDataset[0];
        var rectangle = new Cesium.Rectangle.fromDegrees(
          data.bounds[0],
          data.bounds[1],
          data.bounds[2],
          data.bounds[3]
        );
        const cartographics = [
          Cesium.Rectangle.center(rectangle),
          Cesium.Rectangle.southeast(rectangle),
          Cesium.Rectangle.southwest(rectangle),
          Cesium.Rectangle.northeast(rectangle),
          Cesium.Rectangle.northwest(rectangle),
        ];

        Cesium.sampleTerrainMostDetailed(
          viewer.terrainProvider,
          cartographics
        ).then((updatedPositions) => {
          var cartesians =
            Cesium.Ellipsoid.WGS84.cartographicArrayToCartesianArray(
              updatedPositions
            );
          var boundingSphere = Cesium.BoundingSphere.fromPoints(cartesians);
          viewer.camera.flyToBoundingSphere(boundingSphere);
        });
      }
    }
  }
};

export const loadData = (
  asset,
  data,
  fly,
  timeline,
  timelineTrack,
  select = true
) => {
  if (select) {
    if (!selectedAssetIDs.includes(asset["id"])) {
      setSelectedAssetIDs([...selectedAssetIDs, asset["id"]]);
    }

    if (!selectedDatasets.includes(data)) {
      selectedDatasets.push(data);
    }
  }

  var assetDataset = [];
  asset.data?.map((dataID) => {
    for (var i = 0; i < datasets.length; i++) {
      if (datasets[i].id == dataID) {
        assetDataset.push(datasets[i]);
        break;
      }
    }
  });

  
  if (data["type"] === "Influx" || data["type"]==="ImageSeries") {
    //Influx charts and Image Series from 2 weeks before
    if (data.endDateTime){
      var initialDate = new Date(data.endDateTime);
      viewer.clock.currentTime = new Cesium.JulianDate.fromDate(initialDate);
      viewer.timeline.updateFromClock();
      viewer.timeline.zoomTo(
        Cesium.JulianDate.fromDate(
          new Date(initialDate.getTime() - 2 * 7 * 86400000)
        ),
        Cesium.JulianDate.fromDate(initialDate)
      );
    } else {
      var currentDate = new Date();
      viewer.clock.currentTime = new Cesium.JulianDate.fromDate(currentDate);
      viewer.timeline.updateFromClock();
      viewer.timeline.zoomTo(
        Cesium.JulianDate.fromDate(
          new Date(currentDate.getTime() - 2 * 7 * 86400000)
          // new Date(currentDate.getTime() + 86400000)
        ),
        Cesium.JulianDate.fromDate(new Date())
      );
    }
  } else if (data["type"] === "CSV") {
    if (data.endDateTime){
      if (data.startDateTime){
        viewer.clock.currentTime = new Cesium.JulianDate.fromDate(new Date(data.endDateTime));
        viewer.timeline.updateFromClock();
        viewer.timeline.zoomTo(
          Cesium.JulianDate.fromDate(
            new Date(data.startDateTime)
          ),
          Cesium.JulianDate.fromDate(new Date(data.endDateTime))
        );
      } else {
        var initialDate = new Date(data.endDateTime);
        viewer.clock.currentTime = new Cesium.JulianDate.fromDate(initialDate);
        viewer.timeline.updateFromClock();
        viewer.timeline.zoomTo(
          Cesium.JulianDate.fromDate(
            new Date(initialDate.getTime() - 2 * 7 * 86400000)
          ),
          Cesium.JulianDate.fromDate(initialDate)
        );
      }
    } else {
      var currentDate = new Date();
      viewer.clock.currentTime = new Cesium.JulianDate.fromDate(currentDate);
      viewer.timeline.updateFromClock();
      viewer.timeline.zoomTo(
        Cesium.JulianDate.fromDate(
          new Date(currentDate.getTime() - 2 * 7 * 86400000)
          // new Date(currentDate.getTime() + 86400000)
        ),
        Cesium.JulianDate.fromDate(new Date())
      );
    }
  }

  if (data["type"] === "PointCloud" || data["type"] === "ModelTileset") {
    if (!tilesets[asset["id"]]) tilesets[asset["id"]] = {};
    if (!tilesets[asset["id"]][data.id]) {
      tilesets[asset["id"]][data.id] =
        viewer.scene.primitives.add(
          new Cesium.Cesium3DTileset({
            url:  data["url"]==="ion" ? 
              Cesium.IonResource.fromAssetId(data.assetId) :
              !data.useProxy ?
              data["url"]
              : new Cesium.Resource({
                  url: data["url"],
                  proxy: new Cesium.DefaultProxy("/cesium/proxy/"),
                }),
            maximumScreenSpaceError:
              ((100 - MSSE) / 100) * viewer.canvas.height * 0.25,
            // show: new Date(data["date"]) != "Invalid Date" ? false : true,
          })
        );

      tilesets[asset["id"]][data.id].readyPromise.then(function (
        tileset
      ) {
        // keep tileset visible at all times
        tileset._geometricError= Number.MAX_SAFE_INTEGER;
        
        // console.log(tilesets[asset["id"]][data.id].boundingSphere);
        // var carto = Cesium.Cartographic.fromCartesian(tilesets[asset["id"]][data.id].boundingSphere.center);
        // console.log(carto.latitude * Cesium.Math.DEGREES_PER_RADIAN);
        // console.log(carto.longitude * Cesium.Math.DEGREES_PER_RADIAN);
        // console.log(carto.height);
        if (data["position"]) {
          var offset = Cesium.Cartographic.toCartesian(
            new Cesium.Cartographic.fromDegrees(
              data["position"]["lng"],
              data["position"]["lat"],
              data["position"]["height"]
            )
          );
          var translation = Cesium.Cartesian3.subtract(
            offset,
            tileset.boundingSphere.center,
            new Cesium.Cartesian3()
          );
          tileset.modelMatrix = Cesium.Matrix4.fromTranslation(translation);
        }

        if (data["type"] === "PointCloud") {
          setupStyleToolbar(tileset);
          applyStyle(selectedDimension);
        }
      });
    } else {
      tilesets[asset["id"]][data.id].show = true;
      setupStyleToolbar(tilesets[asset["id"]][data.id]);
    }
  } else if (data["type"] === "Model") {
    //TODO: multiple models for same location
    if (!entities[asset["id"]]) entities[asset["id"]] = {};
    if (!entities[asset["id"]][data["id"]]) {
      var position = Cesium.Cartesian3.fromDegrees(
        data["position"]["lng"],
        data["position"]["lat"],
        data["position"]["height"]
      );
      var hpr = new Cesium.HeadingPitchRoll(
        Cesium.Math.toRadians(data["rotation"]["heading"]),
        Cesium.Math.toRadians(data["rotation"]["pitch"]),
        Cesium.Math.toRadians(data["rotation"]["roll"])
      );
      var orientation = Cesium.Transforms.headingPitchRollQuaternion(
        position,
        hpr
      );

      entities[asset["id"]][data["id"]] = viewer.entities.add({
        position: position,
        orientation: orientation,
        model: {
          uri: data["url"],
        },
      });

      // var model = viewer.scene.primitives.add(Cesium.Model.fromGltf({
      //   url: data["url"],
      // }));
      // Cesium.when(model.readyPromise).then(()=>{
      //   console.log(model.boundingSphere);
      // })
    } else {
      entities[asset["id"]][data["id"]].show = true;
    }
  } else if (data["type"] === "GeoJSON") {
    loadGeoJson(asset, data, fly);
  } else if (data["type"] === "EPTPointCloud") {
    if (!tilesets[asset["id"]]) tilesets[asset["id"]] = {};
    if (!tilesets[asset["id"]][data.id]) {
      var eptURL;
      if (Array.isArray(data.url)) {
        eptURL = data.url[0];
        tilesets[asset["id"]][data.id] = [];
      } else {
        eptURL = data.url;
      }
      fetch(eptURL, { cache: "no-store", credentials: eptURL.startsWith("https://asdc.cloud.edu.au/") ? "include" : "omit"})
        .then((response) => response.text())
        .then((text) => {
          var ept = JSON.parse(text);
          var dimensions = [];
          var truncate = true;
          if (!ept.schema) return
          ept.schema.map((s) => {
            if (s.minimum && s.maximum) {
              if (s.minimum != s.maximum) {
                dimensions.push(s.name);
              }
            } else {
              dimensions.push(s.name);
            }
            if (s.name === "Red" || s.name === "Green" || s.name === "Blue") {
              if (s.maximum && s.maximum <= 255) {
                truncate = false;
              }
            }
          });
          if (Array.isArray(data.url)) {
            data.url.map((url, index) => {
              tilesets[asset["id"]][data.id].push(
                viewer.scene.primitives.add(
                  new Cesium.Cesium3DTileset({
                    url: `${eptServer}/tileset.json?ept=${url}&dimensions=${dimensions.join(
                      ","
                    )}&${truncate ? "truncate" : null}`,
                    maximumScreenSpaceError:
                      ((100 - MSSE) / 100) * viewer.canvas.height * 0.25,
                  })
                )
              );
              if (index == 0) {
                tilesets[asset["id"]][
                  data.id
                ][0].readyPromise.then(function (tileset) {
                  setupStyleToolbar(tileset);
                  applyStyle(selectedDimension);
                });
              }
            });
          } else {
            tilesets[asset["id"]][data.id] =
              viewer.scene.primitives.add(
                new Cesium.Cesium3DTileset({
                  url: `${eptServer}/tileset.json?ept=${
                    data.url
                  }&dimensions=${dimensions.join(",")}&${
                    truncate ? "truncate" : null
                  }`,
                  maximumScreenSpaceError:
                    ((100 - MSSE) / 100) * viewer.canvas.height * 0.25,
                  // show: new Date(data["date"]) != "Invalid Date" ? false : true,
                  // debugShowBoundingVolume:true
                })
              );

            tilesets[asset["id"]][data.id].readyPromise.then(
              function (tileset) {
                tileset._geometricError= Number.MAX_SAFE_INTEGER;

                // console.log(tilesets[asset["id"]][
                //   data.id
                //   ].boundingSphere);
                // var carto = Cesium.Cartographic.fromCartesian(tilesets[asset["id"]][data.id].boundingSphere.center);
                // console.log(carto.latitude * Cesium.Math.DEGREES_PER_RADIAN);
                // console.log(carto.longitude * Cesium.Math.DEGREES_PER_RADIAN);
                // console.log(carto.height);
                // Cesium.sampleTerrainMostDetailed(
                //   viewer.terrainProvider,
                //   [Cesium.Cartographic.fromCartesian(tilesets[asset["id"]][data.id].boundingSphere.center)]
                // ).then((updatedPositions) => {
                //   console.log(updatedPositions);
                //   // var cartesians =
                //   //   Cesium.Ellipsoid.WGS84.cartographicArrayToCartesianArray(
                //   //     updatedPositions
                //   //   );
                //   // var boundingSphere = Cesium.BoundingSphere.fromPoints(cartesians);
                //   // viewer.camera.flyToBoundingSphere(boundingSphere);
                // });

                if (data["position"]) {
                  var offset = Cesium.Cartographic.toCartesian(
                    new Cesium.Cartographic.fromDegrees(
                      data["position"]["lng"],
                      data["position"]["lat"],
                      data["position"]["height"]
                    )
                  );
                  var translation = Cesium.Cartesian3.subtract(
                    offset,
                    tileset.boundingSphere.center,
                    new Cesium.Cartesian3()
                  );
                  tileset.modelMatrix =
                  // tileset.root.transofrm =
                    Cesium.Matrix4.fromTranslation(translation);
                }

                setupStyleToolbar(tileset);
                applyStyle(selectedDimension);
              }
            );
          }
        });
    } else {
      if (Array.isArray(data.url)) {
        tilesets[asset["id"]][data.id].map((t) => {
          t.show = true;
        });
        setupStyleToolbar(tilesets[asset["id"]][data.id][0]);
      } else {
        tilesets[asset["id"]][data.id].show = true;
        setupStyleToolbar(tilesets[asset["id"]][data.id]);
      }
    }
  } else if (data["type"] === "Influx") {
    document.getElementById("graphs-modal").style.display = "block";
    loadInfluxGraphs(data);
  } else if (data["type"] === "CSV") {
    document.getElementById("graphs-modal").style.display = "block";
    loadCSVGraphs(data);
  } else if (data["type"] === "Imagery") {
    if (!imageryLayers[asset.id]) imageryLayers[asset.id] = {};
    if (!imageryLayers[asset.id][data.id]) {
      imageryLayers[asset.id][data.id] =
        viewer.imageryLayers.addImageryProvider(
          new Cesium.UrlTemplateImageryProvider({
            url: !data.useProxy
            ? data["url"]
            : new Cesium.Resource({
                url: data["url"],
                proxy: new Cesium.DefaultProxy("/cesium/proxy/"),
              }),
            rectangle: data.bounds ? new Cesium.Rectangle.fromDegrees(
              data.bounds[0],
              data.bounds[1],
              data.bounds[2],
              data.bounds[3]
            ):Cesium.Rectangle.MAX_VALUE,
            minimumLevel: data.minzoom ? data.minzoom : 0,
            maximumLevel: data.maxzoom ? data.maxzoom : undefined,
          })
        );
    } else {
      viewer.imageryLayers.raiseToTop(imageryLayers[asset.id][data.id]);
      imageryLayers[asset.id][data.id].show = true;
    }
  } else if (data["type"] === "ImageSeries") {
    document.getElementById("image-series-toolbar-row").style.display = "table-row";
    if (!entities[asset.id]) entities[asset.id] = {};
    if (!entities[asset.id][data.id]) {
      var currentDate = Cesium.JulianDate.toDate(viewer.clock.currentTime);

      if (currentDate.getHours() < 12) {
        currentDate.setDate(currentDate.getDate() - 1);
      }
      currentDate.setHours(12, 0, 0);

      var halfWidth = ((data.halfHeightDeg ? data.halfHeightDeg : 0.0025) * data.width) / data.height;
      var halfHeight = (data.halfHeightDeg ? data.halfHeightDeg : 0.0025);

      if (data.rotation){
        var poly = turf.polygon([[
          [data.position["lng"] - halfWidth, data.position["lat"]],
          [data.position["lng"] + halfWidth,data.position["lat"]],
          [data.position["lng"] + halfWidth,data.position["lat"] + 2 * halfHeight],
          [data.position["lng"] - halfWidth,data.position["lat"] + 2 * halfHeight],
          [data.position["lng"] - halfWidth, data.position["lat"]],
        ]]);
        var options = {pivot: [data.position["lng"], data.position["lat"]]};
        var rotatedPoly = turf.transformRotate(poly, data.rotation, options);

        var pointsArray = [];

        for(let point of rotatedPoly.geometry.coordinates[0]) {
          pointsArray.push(point[0]);
          pointsArray.push(point[1]);
        }
      } else {
        var pointsArray = [
          data.position["lng"] - halfWidth, data.position["lat"],
          data.position["lng"] + halfWidth, data.position["lat"],
          data.position["lng"] + halfWidth,data.position["lat"] + 2 * halfHeight,
          data.position["lng"] - halfWidth,data.position["lat"] + 2 * halfHeight
        ]
      }

      var points = Cesium.Cartesian3.fromDegreesArray(pointsArray);
      entities[asset.id][data.id] = viewer.entities.add({
              polygon:{
                hierarchy:points,
                stRotation:data.rotation ? Cesium.Math.toRadians(data.rotation): 0,
                show: !billboard,
              },
              position: Cesium.Cartesian3.fromDegrees(
                data.position["lng"],
                data.position["lat"]
              ),
              billboard: {
                height: 300,
                width: (300 * data.width) / data.height,
                pixelOffset: new Cesium.Cartesian2(0, -150),
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
                  0,
                  5000
                ),
                color: new Cesium.Color.fromAlpha(Cesium.Color.WHITE, 1),
                show: billboard,
              },
            });
      if (data.source && data.source.type === "csv") {
        fetch(
          data.source.url,
          { cache: "no-store" }
        ).then((response) => {
          return response;
        })
        .then((response) => response.text())
        .then((response) => {
          var csvRows = response.split('\n');
          var timeIndex = csvRows[0].split(',').indexOf(data.source.columns.time);
          var imageIndex = csvRows[0].split(',').indexOf(data.source.columns.image);
          csvRows = csvRows.slice(1,csvRows.length-1)

          var earliestDate;
          var earliestRow;
          var firstImage;
          for (var row=0;row<csvRows.length;row++){
            var csvRowColumns = csvRows[row].split(',');
            
            if (new Date(csvRowColumns[timeIndex]).getTime() <= currentDate && (!earliestDate || (earliestDate && earliestDate.getTime()<new Date(csvRowColumns[timeIndex]).getTime()))){
              earliestDate = new Date(csvRowColumns[timeIndex]);
              earliestRow = row;
            }
            if (new Date(csvRowColumns[timeIndex]).getTime() === new Date(data.startDateTime).getTime()){
              firstImage = csvRowColumns[imageIndex];
            }
          }

          if (!!earliestDate && !!earliestRow){
            var imageUrl = data.url.replace("{Image}",csvRows[earliestRow].split(',')[imageIndex])
          } else {
            var imageUrl = data.url.replace("{Image}",firstImage);
          }
          entities[data.asset.id][data.id].polygon.material =
                    new Cesium.ImageMaterialProperty({
                      image: imageUrl,
                      color:
                      new Cesium.Color.fromAlpha(Cesium.Color.WHITE, 1),
                    });

          entities[data.asset.id][data.id].billboard.image = imageUrl;
        })
      } else {
        fetch(
          `/cesium/influx/images?camera=${data.camera}&time=${
            data.timeOffset
              ? currentDate.getTime() - data.timeOffset
              : currentDate.getTime()
          }&startTime=${new Date(data.startDateTime).getTime()}`,
          { cache: "no-store" }
        )
          .then((response) => {
            return response;
          })
          .then((response) => response.json())
          .then((response) => {
            if (response.length != 0) {
              var imageUrl = `https://img.amrf.org.au/cameras/amrf/${
                data.camera
              }/${data.camera}~720x/$dirstamp/${
                data.camera
              }~720x_$filestamp.jpg?timestamp_ms=${new Date(
                response[0].time
              ).getTime()}`;
            } else {
              var imageUrl = `https://img.amrf.org.au/cameras/amrf/${
                data.camera
              }/${data.camera}~720x/$dirstamp/${
                data.camera
              }~720x_$filestamp.jpg?timestamp_ms=${new Date(
                data.startDateTime
              ).getTime()}`;
            }
            entities[data.asset.id][data.id].polygon.material =
                    new Cesium.ImageMaterialProperty({
                      image: imageUrl,
                      color:
                      new Cesium.Color.fromAlpha(Cesium.Color.WHITE, 1),
                    });

            entities[data.asset.id][data.id].billboard.image = imageUrl;
          })
          .catch((error) => {
            console.log(error);
          });
      }
    } else {
      entities[asset.id][data.id].show = true;
    }
  }

  // if (data["type"] != "Influx" && data["type"] != "ImageSeries") {
  //   closeGraphModal();
  // }

  if (
    !!selectedDatasets.find(
      (d) =>
        d.type == "PointCloud" ||
        d.type == "EPTPointCloud" ||
        d.type == "ModelTileset"
    )
  ) {
    document.getElementById("msse-slider-row").style.display = "table-row";
  } else {
    document.getElementById("msse-slider-row").style.display = "none";
  }

  if (fly) {
    if (data.zoom){
      if (data.zoom === "boundingSphere") {
        if (data.position && data.boundingSphereRadius){
          var pos = Cesium.Cartographic.toCartesian(
            Cesium.Cartographic.fromDegrees(
              data.position["lng"],
              data.position["lat"],
              data.position["height"]
            )
          );
          viewer.camera.flyToBoundingSphere(
            new Cesium.BoundingSphere(pos, data.boundingSphereRadius)
          );
        } else {
          if (entities[asset["id"]] && entities[asset["id"]][data["id"]]){
            viewer.flyTo(entities[asset["id"]][data["id"]]);
          }
          if (tilesets[asset["id"]] && tilesets[asset["id"]][data["id"]]){
            viewer.flyTo(tilesets[asset["id"]][data["id"]]);
          }
        }
      } else {
        var zoom = data.zoom;
        viewer.camera.flyTo({
          destination:new Cesium.Cartesian3(
            zoom.position.x,
            zoom.position.y,
            zoom.position.z),
          orientation : {
            direction : new Cesium.Cartesian3(
              zoom.orientation.direction.x,
              zoom.orientation.direction.y,
              zoom.orientation.direction.z
            ),
            up: new Cesium.Cartesian3(
              zoom.orientation.up.x,
              zoom.orientation.up.y,
              zoom.orientation.up.z
            )
          }
        })
      }
    } else {
      if (assetDataset[0].zoom){
        var zoom = assetDataset[0].zoom;
        viewer.camera.flyTo({
          destination:new Cesium.Cartesian3(
            zoom.position.x,
            zoom.position.y,
            zoom.position.z),
          orientation : {
            direction : new Cesium.Cartesian3(
              zoom.orientation.direction.x,
              zoom.orientation.direction.y,
              zoom.orientation.direction.z
            ),
            up: new Cesium.Cartesian3(
              zoom.orientation.up.x,
              zoom.orientation.up.y,
              zoom.orientation.up.z
            )
          }
        })
      } else {
        if (
          assetDataset[0]["type"] === "PointCloud" ||
          assetDataset[0]["type"] === "EPTPointCloud" ||
          assetDataset[0]["type"] === "ModelTileset"
        ) {
          if (assetDataset[0].position && assetDataset[0].boundingSphereRadius){
            var pos = Cesium.Cartographic.toCartesian(
              Cesium.Cartographic.fromDegrees(
                assetDataset[0].position["lng"],
                assetDataset[0].position["lat"],
                assetDataset[0].position["height"]
              )
            );
            viewer.camera.flyToBoundingSphere(
              new Cesium.BoundingSphere(pos, assetDataset[0].boundingSphereRadius)
            );
          } else {
            viewer.flyTo(tilesets[asset.id][data.id])
          }
        } else if (assetDataset[0]["type"] === "Model") {
          viewer.flyTo(entities[asset["id"]][data["id"]]);
        } else if (
          assetDataset[0]["type"] === "Influx" ||
          // assetDataset[0]["type"] === "ImageSeries" ||
          assetDataset[0]["type"] === "CSV"
        ) {
          // if (assetDataset[0] && assetDataset[0]["position"]){
            var position = Cesium.Cartesian3.fromDegrees(
              assetDataset[0]["position"]["lng"],
              assetDataset[0]["position"]["lat"],
              assetDataset[0]["position"]["height"] ? assetDataset[0]["position"]["height"] + 1750 : 1750
            );

            viewer.camera.flyTo({ 
              destination: position,
              orientation:{
                heading: assetDataset[0]["rotation"] ? Cesium.Math.toRadians(assetDataset[0]["rotation"]):0
              }
            });
          // }
        } else if (assetDataset[0]["type"] === "ImageSeries") {
          if (entities[asset.id][
            data.id
          ]){
            Cesium.sampleTerrainMostDetailed(
              viewer.terrainProvider,
              Cesium.Ellipsoid.WGS84.cartesianArrayToCartographicArray(
                  entities[asset.id][
                    data.id
                  ].polygon.hierarchy.getValue().positions
              )
            ).then((updatedPositions) => {
              viewer.camera.flyToBoundingSphere(
                Cesium.BoundingSphere.fromPoints(
                  Cesium.Ellipsoid.WGS84.cartographicArrayToCartesianArray(
                    updatedPositions
                  )
                ),
                {
                  offset: new Cesium.HeadingPitchRange(
                    entities[asset.id][data.id].polygon.stRotation,
                    Cesium.Math.toRadians(-90),
                    0)
                }
              );
            });
          }
        } else if (assetDataset[0]["type"] === "Imagery") {
          if (assetDataset[0].bounds){
            var rectangle = new Cesium.Rectangle.fromDegrees(
              assetDataset[0].bounds[0],
              assetDataset[0].bounds[1],
              assetDataset[0].bounds[2],
              assetDataset[0].bounds[3]
            );
            const cartographics = [
              Cesium.Rectangle.center(rectangle),
              Cesium.Rectangle.southeast(rectangle),
              Cesium.Rectangle.southwest(rectangle),
              Cesium.Rectangle.northeast(rectangle),
              Cesium.Rectangle.northwest(rectangle),
            ];

            Cesium.sampleTerrainMostDetailed(
              viewer.terrainProvider,
              cartographics
            ).then((updatedPositions) => {
              var cartesians =
                Cesium.Ellipsoid.WGS84.cartographicArrayToCartesianArray(
                  updatedPositions
                );
              var boundingSphere = Cesium.BoundingSphere.fromPoints(cartesians);
              viewer.camera.flyToBoundingSphere(boundingSphere);
            });
          } else {
            console.log(asset);
            console.log(data);
            if (tilesets[asset.id] && tilesets[asset.id][data.id]){
              viewer.flyTo(tilesets[asset.id][data.id]);
            } else if (imageryLayers[asset.id] && imageryLayers[asset.id][data.id]){
              viewer.flyTo(imageryLayers[asset.id][data.id]);
            }
          }
        }
      }
    }
  }

  if (timeline) {
    var date = new Date(data.date);
    viewer.timeline._highlightRanges = [];
    viewer.timeline._makeTics();
    if (data.type == "PointCloud" ||
      data.type == "EPTPointCloud" ||
      data.type == "ModelTileset" ||
      data.type == "Imagery"||
      data.type == "GeoJSON"
      ){
      if (date.toString() !== "Invalid Date") {
        viewer.timeline
          .addHighlightRange(highlightColor, highlightHeightPX)
          .setRange(
            Cesium.JulianDate.fromDate(new Date(date)),
            Cesium.JulianDate.fromDate(
              new Date(new Date(date).getTime() + 86400000)
            )
          );

        viewer.clock.currentTime = new Cesium.JulianDate.fromDate(date);
        viewer.timeline.updateFromClock();
        viewer.timeline.zoomTo(
          Cesium.JulianDate.fromDate(date),
          Cesium.JulianDate.fromDate(new Date(date.getTime() + 86400000))
        );
        // if (data["type"] === "PointCloud" || data["type"] === "EPTPointCloud") {
        //   setupStyleToolbar(tilesets[asset["id"]][data.id]);
        // }
      } else {
        //point clouds with no date
        // var currentDate = new Date();
        // viewer.clock.currentTime = new Cesium.JulianDate.fromDate(
        //     new Date()
        // );
        // viewer.timeline.updateFromClock();
        // viewer.timeline.zoomTo(
        //     Cesium.JulianDate.fromDate(currentDate),
        //     Cesium.JulianDate.fromDate(
        //         new Date(currentDate.getTime() + 86400000)
        //     )
        // );
      }
    } else {
      //Other data types with no date
      // var currentDate = new Date();
      // viewer.clock.currentTime = new Cesium.JulianDate.fromDate(
      //     new Date()
      // );
      // viewer.timeline.updateFromClock();
      // viewer.timeline.zoomTo(
      //     Cesium.JulianDate.fromDate(currentDate),
      //     Cesium.JulianDate.fromDate(
      //         new Date(currentDate.getTime() + 86400000)
      //     )
      // );
    }
  }

  if (timelineTrack) {
    var date = new Date(data.date);
    if (date == "Invalid Date") return;

    if (!timelineTracks[asset["id"]]) {
      var track = viewer.timeline.addTrack(
        null,
        8,
        Cesium.Color.RED,
        Object.keys(timelineTracks).length % 2 === 0
          ? Cesium.Color.BLACK
          : new Cesium.Color(0.25, 0.25, 0.25)
      );

      track.intervals = [
        new Cesium.TimeInterval({
          start: Cesium.JulianDate.fromDate(new Date(date)),
          stop: Cesium.JulianDate.fromDate(
            new Date(new Date(date).getTime() + 86400000)
          ),
        }),
      ];

      timelineTracks[asset["id"]] = track;
    } else {
      var interval = new Cesium.TimeInterval({
        start: Cesium.JulianDate.fromDate(new Date(date)),
        stop: Cesium.JulianDate.fromDate(
          new Date(new Date(date).getTime() + 86400000)
        ),
      });

      if (
        !timelineTracks[asset["id"]].intervals.find((item) => {
          return (
            item.start.equals(interval.start) && item.stop.equals(interval.stop)
          );
        })
      ) {
        timelineTracks[asset["id"]].intervals.push(interval);
      }
    }

    viewer.timeline._makeTics();

    viewer.timeline.container.style.bottom =
      Object.keys(timelineTracks).length * 8 - 1 + "px";
    viewer.timeline._trackContainer.style.height =
      Object.keys(timelineTracks).length * 8 + 1 + "px";
    viewer.timeline.container.style.overflow = "visible";
    viewer.timeline._trackContainer.style.overflow = "hidden";
  }
};

export const loadGeoJson = (asset, data, fly) => {
  var dataset = data.url;

  if (!dataSources[asset.id]) dataSources[asset.id] = {};
  var dataID = data.id;

  if (!dataSources[asset.id][dataID]) {
    var geoJsonPromise = Cesium.GeoJsonDataSource.load(dataset, {
      // clampToGround: true  //issues with picking polygons, using terrain sampling
    });

    // viewer.dataSources.add(geoJsonPromise);

    dataSources[asset.id][dataID] = new Cesium.CustomDataSource();

    viewer.dataSources.add(dataSources[asset.id][dataID]);
    geoJsonPromise.then((dataSource) => {
      // var entities = dataSource.entities.values;
      var samplePromises = [];

      dataSource.entities.values.map((entity) => {
        if (entity.polygon) {
          var positions = entity.polygon.hierarchy.getValue().positions;
          var cartoPositions = [];
          positions.map((pos) => {
            var carto = Cesium.Cartographic.fromCartesian(pos);
            cartoPositions.push(
              new Cesium.Cartographic(carto.longitude, carto.latitude)
            );
          });

          samplePromises.push(
            Cesium.sampleTerrainMostDetailed(
              viewer.terrainProvider,
              cartoPositions
            ).then((updatedPositions) => {
              var polygonEntity = dataSources[asset.id][dataID].entities.add({
                polygon: {
                  hierarchy: new Cesium.PolygonHierarchy(
                    Cesium.Ellipsoid.WGS84.cartographicArrayToCartesianArray(
                      updatedPositions
                    )
                  ),
                  // hierarchy:new Cesium.CallbackProperty( () => {
                  //   updatedPositions.map(cartoPoint=>{
                  //   // var height = viewer.scene.sampleHeight(cartoPoint);
                  //   var height = viewer.scene.globe.getHeight(cartoPoint);
                  //   // console.log(height);
                  //   if (height){
                  //     cartoPoint.height=height;
                  //   }
                  // })
                  //   return(new Cesium.PolygonHierarchy(Cesium.Ellipsoid.WGS84.cartographicArrayToCartesianArray(updatedPositions)));
                  // },false),  //slow
                  material: Cesium.Color.RED,
                  perPositionHeight: true,
                  // perPositionHeight: false, //picking issues
                  arcType: Cesium.ArcType.GEODESIC,
                },
              });
              polygonEntity.properties = entity.properties;
            })
          );
        }
        if (entity.polyline) {
          var positions = entity.polyline.positions._value;
          var cartoPositions = [];
          positions.map((pos) => {
            var carto = Cesium.Cartographic.fromCartesian(pos);
            cartoPositions.push(
              new Cesium.Cartographic(carto.longitude, carto.latitude)
            );
          });

          samplePromises.push(
            Cesium.sampleTerrainMostDetailed(
              viewer.terrainProvider,
              cartoPositions
            ).then((updatedPositions) => {
              var polylineEntity = dataSources[asset.id][dataID].entities.add({
                polyline: {
                  positions:
                    Cesium.Ellipsoid.WGS84.cartographicArrayToCartesianArray(
                      updatedPositions
                    ),
                  material: Cesium.Color.YELLOW,
                },
              });
              polylineEntity.properties = entity.properties;
            })
          );
        }
      });
      Promise.all(samplePromises).then(() => {
        dataSource = null;
        geoJsonPromise = null;
        if (fly) {
          viewer.flyTo(dataSources[asset.id][dataID]);
          // document.getElementById("msse-slider-row").style.display =
          //   "none";
        }
      });
    });
  } else {
    dataSources[asset.id][dataID].show = true;
    if (fly) {
      viewer.flyTo(dataSources[asset.id][dataID]);
      // document.getElementById("msse-slider-row").style.display = "none";
    }
    // Cesium.when(viewer.dataSourceDisplay.ready, function () {
    //   console.log("ready");
    //     var boundingSpheres=[];
    //     var entities = dataSources[asset.id][dataID].entities.values;
    //     for (var i=0;i<entities.length;i++){
    //       var boundingSphere = new Cesium.BoundingSphere();
    //       var state = viewer.dataSourceDisplay.getBoundingSphere(
    //         entities[i],
    //         false,
    //         boundingSphere
    //       );
    //       console.log(state);
    //       if (state === 0){
    //         boundingSpheres.push(boundingSphere);
    //       } else {
    //         return;
    //       }
    //     }
    //     var full = Cesium.BoundingSphere.fromBoundingSpheres(boundingSpheres);
    //     console.log(full);
    //     var fullCarto = Cesium.Cartographic.fromCartesian(full.center)
    //     console.log(fullCarto);
    //     console.log(fullCarto.longitude * Cesium.Math.DEGREES_PER_RADIAN);
    //     console.log(fullCarto.latitude * Cesium.Math.DEGREES_PER_RADIAN);
    //   });
  }
};

export const setScreenSpaceError = (evt) => {
  setMSSE(parseInt(evt.target.value));

  document.getElementById("msse-value").innerHTML = MSSE + " %";

  Object.keys(tilesets).map((tileset) => {
    Object.keys(tilesets[tileset]).map((id) => {
      if (Array.isArray(tilesets[tileset][id])) {
        tilesets[tileset][id].map((t) => {
          t.maximumScreenSpaceError =
            ((100 - MSSE) / 100) * viewer.canvas.height * 0.25;
          if (MSSE === 0) {
            t.show = false;
          } else {
            if (!!selectedDatasets.find(d=>d.id==id) || selectedData.id ==id ){
              t.show=true;
            }
          }
        });
      } else {
        tilesets[tileset][id].maximumScreenSpaceError =
          ((100 - MSSE) / 100) * viewer.canvas.height * 0.25;
        if (MSSE === 0) {
          if (!!selectedDatasets.find(d=>d.id==id) || (selectedData && selectedData.id ==id) ){
            tilesets[tileset][id].show = false;
          }
        } else {
          if (!!selectedDatasets.find(d=>d.id==id) || (selectedData && selectedData.id ==id)){
            tilesets[tileset][id].show=true;
          }
        }
      }
    });
  });
};

//overwriting TimelineTrack render for multiple intervals
Cesium.TimelineTrack.prototype.render = function (context, renderState) {
  if (!this.intervals) return;

  context.fillStyle = this.backgroundColor.toCssColorString();
  context.fillRect(0, renderState.y, renderState.timeBarWidth, this.height);

  this.intervals.map((interval) => {
    const startInterval = interval.start;
    const stopInterval = interval.stop;

    const spanStart = renderState.startJulian;
    const spanStop = Cesium.JulianDate.addSeconds(
      renderState.startJulian,
      renderState.duration,
      new Cesium.JulianDate()
    );

    if (
      Cesium.JulianDate.lessThan(startInterval, spanStart) &&
      Cesium.JulianDate.greaterThan(stopInterval, spanStop)
    ) {
      //The track takes up the entire visible span.
      context.fillStyle = this.color.toCssColorString();
      context.strokeStyle = 'white';
      // context.fillRect(0, renderState.y, renderState.timeBarWidth, this.height);
      context.beginPath();
      context.rect(0, renderState.y, renderState.timeBarWidth, this.height);
      context.fill();
      context.stroke();
      context.closePath();

    } else if (
      Cesium.JulianDate.lessThanOrEquals(startInterval, spanStop) &&
      Cesium.JulianDate.greaterThanOrEquals(stopInterval, spanStart)
    ) {
      //The track only takes up some of the visible span, compute that span.
      let x;
      let start, stop;
      for (x = 0; x < renderState.timeBarWidth; ++x) {
        const currentTime = Cesium.JulianDate.addSeconds(
          renderState.startJulian,
          (x / renderState.timeBarWidth) * renderState.duration,
          new Cesium.JulianDate()
        );
        if (
          !Cesium.defined(start) &&
          Cesium.JulianDate.greaterThanOrEquals(currentTime, startInterval)
        ) {
          start = x;
        } else if (
          !Cesium.defined(stop) &&
          Cesium.JulianDate.greaterThanOrEquals(currentTime, stopInterval)
        ) {
          stop = x;
        }
      }

      if (Cesium.defined(start)) {
        if (!Cesium.defined(stop)) {
          stop = renderState.timeBarWidth;
        }
        context.fillStyle = this.color.toCssColorString();
        context.strokeStyle = 'white';
        context.beginPath();
        context.rect(
          start,
          renderState.y,
          Math.max(stop - start, 1),
          this.height
        );
        context.fill();
        context.stroke();
        context.closePath();
      }
    }
  });
};

export const syncTimeline = (setCurrentTime) => {
  var validDates = selectedDatasets.filter(
    (d) => new Date(d.date) != "Invalid Date"
  );

  validDates.sort(function (a, b) {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  if (validDates.length === 0) return;
  var minDate = new Date(validDates[0].date);
  var maxDate = new Date(validDates[validDates.length - 1].date);

  if (
    minDate.toString() !== "Invalid Date" &&
    maxDate.toString() !== "Invalid Date"
  ) {
    if (setCurrentTime) {
      viewer.clock.currentTime = new Cesium.JulianDate.fromDate(minDate);
      viewer.timeline.updateFromClock();
    }
    viewer.timeline.zoomTo(
      Cesium.JulianDate.fromDate(minDate),
      Cesium.JulianDate.fromDate(new Date(maxDate.getTime() + 86400000))
    );
  }

  viewer.timeline._trackList.map((track, index) => {
    track.backgroundColor =
      index % 2 === 0 ? Cesium.Color.BLACK : new Cesium.Color(0.25, 0.25, 0.25);
  });

  viewer.timeline._makeTics();
};

export const fetchIndexAssets = ()=>{
  return(
  fetch(indexFile, { cache: "no-store" })
    .then((response) => response.json())
    .then((jsonResponse) => {
      setAssets(jsonResponse["assets"]);
      setDatasets(jsonResponse["datasets"]);
      setCategories(jsonResponse["categories"]);
      setInitVars(jsonResponse["initVars"])
    })
  ).catch(error => {
    console.error(error);
  })
}

export const fetchWebODMProjects = (token={}) => {
  return (
    new Promise(function (resolve, reject) {
      var controller = new AbortController();
      token.cancel = ()=>{
        reject();
        controller.abort();
      }

      fetch("https://asdc.cloud.edu.au/api/projects/?ordering=-created_at", {
        cache: "no-store",
        credentials: 'include',
        signal:controller.signal
      })
        .then(response => {
          var signInButton = document.createElement("div");
          signInButton.className = "sidebar-item";
          signInButton.style["text-align"] = "center";
          signInButton.innerHTML = "Login here to view your ASDC data";
          signInButton.onclick=()=>{
            window.location.href = `https://asdc.cloud.edu.au/login/auth0?next=${window.location.href}`; 
          }

          if (response.status===200){
            document.getElementById("login-logout-button-text").innerHTML = "Logout";

            document.getElementById("login-logout-button").onclick = ()=>{
              token.cancel();

              fetch("https://asdc.cloud.edu.au/logout/", {
                cache: "no-store",
                credentials: 'include',
                mode: 'no-cors'
              }).then(()=>{
                document.getElementById("login-logout-button-text").innerHTML = "Login";
                const children = [...sourceDivs["WebODM Projects"].nextElementSibling.children];
                for (var i=0;i<children.length;i++){
                    sourceDivs["WebODM Projects"].nextElementSibling.removeChild(children[i]);
                }
                sourceDivs["WebODM Projects"].nextElementSibling.appendChild(signInButton);

                if (sourceDivs["WebODM Projects"].nextElementSibling.style.maxHeight){
                  sourceDivs["WebODM Projects"].nextElementSibling.style.maxHeight = signInButton.scrollHeight + "px";
                }

                document.getElementById("login-logout-button").onclick = signInButton.onclick;

                selectedDatasets.filter(d=>d.asset.project).map(d=>{
                  if(d.type=="Imagery"){
                    viewer.imageryLayers.remove(imageryLayers[d.asset.id][d.id], true);
                    imageryLayers[d.asset.id][d.id] = imageryLayers[d.asset.id][d.id] && imageryLayers[d.asset.id][d.id].destroy();                  
                  } else if (d.type==="EPTPointCloud") {
                    viewer.scene.primitives.remove(tilesets[d.asset.id][d.id])
                    tilesets[d.asset.id][d.id] = tilesets[d.asset.id][d.id] && tilesets[d.asset.id][d.id].destroy();
                  }
                })
                setSelectedDatasets(selectedDatasets.filter(d=>!d.asset.project));
                setDatasets(datasets.filter(d=>d.asset && !d.asset.project));

                assets.filter(a=>a.project).map(a=>{
                  markersDataSource.entities.removeById("marker_" + a.id);
                })

                setAssets(assets.filter(a=>!a.project));
                setODMProjects();
  
                viewer.camera.moveEnd.raiseEvent();
                if (
                  !selectedDatasets.find(
                    (d) =>
                      d.type == "PointCloud" ||
                      d.type == "EPTPointCloud" ||
                      d.type == "ModelTileset"
                  )
                ) 
                {
                  document.getElementById("msse-slider-row").style.display = "none";
                  document.getElementById("dims-toolbar-row").style.display = "none";
                }
              })
            }

            return response.json()
          } else {
            if (response.status===403){
              document.getElementById("login-logout-button-text").innerHTML = "Login";
              document.getElementById("login-logout-button").onclick = signInButton.onclick;

              if (sourceDivs["WebODM Projects"].nextElementSibling.firstChild.className === "loader-parent"){
                sourceDivs["WebODM Projects"].nextElementSibling.removeChild(sourceDivs["WebODM Projects"].nextElementSibling.firstChild);
              }
              sourceDivs["WebODM Projects"].nextElementSibling.appendChild(signInButton)
            }
            resolve();
          }
        })
        .then((odmProjects) => {
          if (!odmProjects) return
          setODMProjects(odmProjects)
          var odmAssets = [];
          var odmDatasets = [];
          var taskInfoPromises = [];
          var metaDataPromises = [];
          if (Array.isArray(odmProjects)) {
            odmProjects.map((project) => {
              taskInfoPromises.push(fetch(`https://asdc.cloud.edu.au/api/projects/${project.id}/tasks/?ordering=-created_at`, {
                cache: "no-store",
                credentials: 'include',
                signal:controller.signal
              }).then(response => response.json()));
            })
          }
          var lastAssetIndex = assets[assets.length - 1].id;
          Promise.all(taskInfoPromises).then((taskInfos, taskIndex) => {
            if (Array.isArray(odmProjects)) {
              var taskDict = {};
              odmProjects.map((project, projectIndex) => {
                taskInfos[projectIndex].map(task => {
                  taskDict[task.id] = task;
                  if (task.available_assets.includes("georeferenced_model.laz")) {
                    metaDataPromises.push(fetch(`https://asdc.cloud.edu.au/api/projects/${project.id}/tasks/${task.id}/assets/entwine_pointcloud/ept.json`, {
                      cache: "no-store",
                      credentials: 'include',
                      signal:controller.signal
                    }).then(response => {
                      if(response.status===200){
                        return response.json();
                      }
                    }).catch((e) => {
                      if (e.name !== "AbortError") {
                        console.log(e);
                      }
                    }))
                  }
                  if (task.available_assets.includes("orthophoto.tif")) {
                    metaDataPromises.push(fetch(`https://asdc.cloud.edu.au/api/projects/${project.id}/tasks/${task.id}/orthophoto/metadata`, {
                      cache: "no-store",
                      credentials: 'include',
                      signal:controller.signal
                    }).then(response => {
                      if(response.status===200){
                        return response.json();
                      }
                    }).catch((e) => {
                      if (e.name !== "AbortError") {
                        console.log(e);
                      }
                    }))
                  }
                  if (task.available_assets.includes("dsm.tif")) {
                    metaDataPromises.push(fetch(`https://asdc.cloud.edu.au/api/projects/${project.id}/tasks/${task.id}/dsm/metadata`, {
                      cache: "no-store",
                      credentials: 'include',
                      signal:controller.signal
                    }).then(response => {
                      if(response.status===200){
                        return response.json();
                      }
                    }).catch((e) => {
                      if (e.name !== "AbortError") {
                        console.log(e);
                      }
                    }))
                  }
                  if (task.available_assets.includes("dtm.tif")) {
                    metaDataPromises.push(fetch(`https://asdc.cloud.edu.au/api/projects/${project.id}/tasks/${task.id}/dtm/metadata`, {
                      cache: "no-store",
                      credentials: 'include',
                      signal:controller.signal
                    }).then(response => {
                      if(response.status===200){
                        return response.json();
                      }
                    }).catch((e) => {
                      if (e.name !== "AbortError") {
                        console.log(e);
                      }
                    }))
                  }
                })
              })
              setTaskInfos(taskDict);
            }

            Promise.all(metaDataPromises).then((metadata) => {
              var metadataIndex = 0;
              if (Array.isArray(odmProjects)) {
                odmProjects.map((project, projectIndex) => {
                  taskInfos[projectIndex].map((task, taskIndex) => {
                    var taskData = [];
                    if (task.available_assets.includes("georeferenced_model.laz")) {
                      if (metadata[metadataIndex]) {
                        if (metadata[metadataIndex].srs && metadata[metadataIndex].srs.wkt){
                          var sourcePos = [];
                          sourcePos[0] = (metadata[metadataIndex].bounds[0] + metadata[metadataIndex].bounds[3]) / 2;
                          sourcePos[1] = (metadata[metadataIndex].bounds[1] + metadata[metadataIndex].bounds[4]) / 2;
                          sourcePos[2] = (metadata[metadataIndex].bounds[2] + metadata[metadataIndex].bounds[5]) / 2;
                          var pos = proj4(metadata[metadataIndex].srs.wkt, proj4.defs('EPSG:4326'), sourcePos);

                          var nw = proj4(metadata[metadataIndex].srs.wkt, proj4.defs('EPSG:4326'), [metadata[metadataIndex].bounds[0], metadata[metadataIndex].bounds[1]])
                          var se = proj4(metadata[metadataIndex].srs.wkt, proj4.defs('EPSG:4326'), [metadata[metadataIndex].bounds[3], metadata[metadataIndex].bounds[4]])

                          var rectangle = new Cesium.Rectangle.fromDegrees(
                            nw[0],
                            nw[1],
                            se[0],
                            se[1]
                          );

                          const cartographics = [
                            Cesium.Rectangle.center(rectangle),
                            Cesium.Rectangle.southeast(rectangle),
                            Cesium.Rectangle.southwest(rectangle),
                            Cesium.Rectangle.northeast(rectangle),
                            Cesium.Rectangle.northwest(rectangle),
                          ];

                          var cartesians =
                            Cesium.Ellipsoid.WGS84.cartographicArrayToCartesianArray(
                              cartographics
                            );
                          var boundingSphere = Cesium.BoundingSphere.fromPoints(cartesians);

                          odmDatasets.push({
                            id: task.id + "-pc",
                            type: "EPTPointCloud",
                            name: "Point Cloud",
                            url: `https://asdc.cloud.edu.au/api/projects/${project.id}/tasks/${task.id}/assets/entwine_pointcloud/ept.json`,
                            asset: odmAssets[odmAssets.length - 1],
                            "position": {
                              "lng": pos[0],
                              "lat": pos[1],
                              "height": pos[2]
                            },
                            boundingSphereRadius: boundingSphere.radius,
                            source:{
                              url:`https://asdc.cloud.edu.au/api/projects/${project.id}/tasks/${task.id}/download/georeferenced_model.laz`
                            }
                          })
                          taskData.push(task.id + "-pc");
                        } else {
                          // console.log(metadata[metadataIndex])
                          // console.log(project);
                          // console.log(task);
                        }
                      }
                      metadataIndex++;
                    }

                    var imageryTypes = ["Orthophoto","DSM","DTM"];
                    imageryTypes.map(imageryType=>{
                      if (task.available_assets.includes(`${imageryType.toLowerCase()}.tif`)) {
                        if (metadata[metadataIndex]) {
                          var tilesUrl;
                          if (imageryType==="Orthophoto") {
                            tilesUrl = `https://asdc.cloud.edu.au${metadata[metadataIndex].tiles[0]}?rescale=${metadata[metadataIndex].statistics[1].min},${metadata[metadataIndex].statistics[1].max}`;
                          } else if (imageryType==="DSM") {
                            tilesUrl = `https://asdc.cloud.edu.au${metadata[metadataIndex].tiles[0]}?color_map=viridis&rescale=${metadata[metadataIndex].statistics[1].min},${metadata[metadataIndex].statistics[1].max}&hillshade=6`;
                          } else if (imageryType==="DTM") {
                            tilesUrl = `https://asdc.cloud.edu.au${metadata[metadataIndex].tiles[0]}?color_map=viridis&rescale=${metadata[metadataIndex].statistics[1].min},${metadata[metadataIndex].statistics[1].max}&hillshade=6`;
                          }

                          odmDatasets.push({
                            id: task.id + (imageryType === "Orthophoto" ? "-op" : "-" + imageryType.toLowerCase()),
                            type: "Imagery",
                            name: imageryType,
                            url: tilesUrl,
                            asset: odmAssets[odmAssets.length - 1],
                            bounds: metadata[metadataIndex].bounds.value,
                            minzoom: metadata[metadataIndex].minzoom,
                            maxzoom: metadata[metadataIndex].maxzoom,
                            position: {
                              "lng": metadata[metadataIndex].center[0],
                              "lat": metadata[metadataIndex].center[1],
                              "height": metadata[metadataIndex].center[2],//zoom level?
                            },
                            source:{
                              url:`https://asdc.cloud.edu.au/api/projects/${project.id}/tasks/${task.id}/download/${imageryType.toLowerCase()}.tif`
                            }
                          })
                          taskData.push(task.id + (imageryType === "Orthophoto" ? "-op" : "-" + imageryType.toLowerCase()));
                        }
                        metadataIndex++;
                      }
                    })

                    if (taskData.length > 0) {
                      odmAssets.push({
                        "id": ++lastAssetIndex,
                        "name": task.name,
                        "status": "active",
                        "categoryID": -1,
                        "data": taskData,
                        project: project.id,
                        taskID: task.id
                      })
                    }
                  })
                })
                setAssets(assets.concat(odmAssets));
                setDatasets(datasets.concat(odmDatasets));
                resolve();
              }
            })
          })
        })
        .catch(error => {
          if (error.name !== "AbortError") {
            console.log(error);
          }
          reject();
        })
    })
  );
}

export const fetchPublicTask = ()=>{
  return(new Promise(function (resolve,reject){
  fetch(`https://asdc.cloud.edu.au/public/task/${publicTask}/json`, {
        cache: "no-store",
      })
      .then(response => response.json())
      .then((publicTask) => {
        var projectID = publicTask.project;
        var metaDataPromises = [];
        var odmAssets = [];
        var odmDatasets = [];
        var taskDict= {};
        taskDict[publicTask.id] = publicTask;
        setTaskInfos(taskDict);
        if (publicTask.available_assets.includes("georeferenced_model.laz")) {
          metaDataPromises.push(fetch(`https://asdc.cloud.edu.au/api/projects/${projectID}/tasks/${publicTask.id}/assets/entwine_pointcloud/ept.json`, {
            cache: "no-store",
          }).then(response => {
            if(response.status===200){
              return response.json();
            }
          }).catch((e) => {
            console.log(e);
          }))
        }
        if (publicTask.available_assets.includes("orthophoto.tif")) {
          metaDataPromises.push(fetch(`https://asdc.cloud.edu.au/api/projects/${projectID}/tasks/${publicTask.id}/orthophoto/metadata`, {
            cache: "no-store",
          }).then(response => {
            if(response.status===200){
              return response.json();
            }
          }).catch((e) => {
            console.log(e);
          }))
        }
        if (publicTask.available_assets.includes("dsm.tif")) {
          metaDataPromises.push(fetch(`https://asdc.cloud.edu.au/api/projects/${projectID}/tasks/${publicTask.id}/dsm/metadata`, {
            cache: "no-store",
          }).then(response => {
            if(response.status===200){
              return response.json();
            }
          }).catch((e) => {
            console.log(e);
          }))
        }
        if (publicTask.available_assets.includes("dtm.tif")) {
          metaDataPromises.push(fetch(`https://asdc.cloud.edu.au/api/projects/${projectID}/tasks/${publicTask.id}/dtm/metadata`, {
            cache: "no-store",
          }).then(response => {
            if(response.status===200){
              return response.json();
            }
          }).catch((e) => {
            console.log(e);
          }))
        }

        Promise.all(metaDataPromises).then((metadata)=>{
          var taskData = [];
          var metadataIndex=0
          if (publicTask.available_assets.includes("georeferenced_model.laz")) {
            if (metadata[metadataIndex]) {
              if (metadata[metadataIndex].srs && metadata[metadataIndex].srs.wkt){
                var sourcePos = [];
                sourcePos[0] = (metadata[metadataIndex].bounds[0] + metadata[metadataIndex].bounds[3]) / 2;
                sourcePos[1] = (metadata[metadataIndex].bounds[1] + metadata[metadataIndex].bounds[4]) / 2;
                sourcePos[2] = (metadata[metadataIndex].bounds[2] + metadata[metadataIndex].bounds[5]) / 2;
                var pos = proj4(metadata[metadataIndex].srs.wkt, proj4.defs('EPSG:4326'), sourcePos);

                var nw = proj4(metadata[metadataIndex].srs.wkt, proj4.defs('EPSG:4326'), [metadata[metadataIndex].bounds[0], metadata[metadataIndex].bounds[1]])
                var se = proj4(metadata[metadataIndex].srs.wkt, proj4.defs('EPSG:4326'), [metadata[metadataIndex].bounds[3], metadata[metadataIndex].bounds[4]])

                var rectangle = new Cesium.Rectangle.fromDegrees(
                  nw[0],
                  nw[1],
                  se[0],
                  se[1]
                );

                const cartographics = [
                  Cesium.Rectangle.center(rectangle),
                  Cesium.Rectangle.southeast(rectangle),
                  Cesium.Rectangle.southwest(rectangle),
                  Cesium.Rectangle.northeast(rectangle),
                  Cesium.Rectangle.northwest(rectangle),
                ];

                var cartesians =
                  Cesium.Ellipsoid.WGS84.cartographicArrayToCartesianArray(
                    cartographics
                  );
                var boundingSphere = Cesium.BoundingSphere.fromPoints(cartesians);

                odmDatasets.push({
                  id: publicTask.id + "-pc",
                  type: "EPTPointCloud",
                  name: "Point Cloud",
                  url: `https://asdc.cloud.edu.au/api/projects/${projectID}/tasks/${publicTask.id}/assets/entwine_pointcloud/ept.json`,
                  asset: odmAssets[odmAssets.length - 1],
                  "position": {
                    "lng": pos[0],
                    "lat": pos[1],
                    "height": pos[2]
                  },
                  boundingSphereRadius: boundingSphere.radius
                })
                taskData.push(publicTask.id + "-pc");
              }
            }
            metadataIndex++;
          }

          if (publicTask.available_assets.includes("orthophoto.tif")) {
            if (metadata[metadataIndex]) {
              odmDatasets.push({
                id: publicTask.id + "-op",
                type: "Imagery",
                name: "Orthophoto",
                url: `https://asdc.cloud.edu.au${metadata[metadataIndex].tiles[0]}?rescale=${metadata[metadataIndex].statistics[1].min},${metadata[metadataIndex].statistics[1].max}`,
                asset: odmAssets[odmAssets.length - 1],
                bounds: metadata[metadataIndex].bounds.value,
                minzoom: metadata[metadataIndex].minzoom,
                maxzoom: metadata[metadataIndex].maxzoom,
                position: {
                  "lng": metadata[metadataIndex].center[0],
                  "lat": metadata[metadataIndex].center[1],
                  "height": metadata[metadataIndex].center[2],//zoom level?
                }
              })
              taskData.push(publicTask.id + "-op");
            }
            metadataIndex++;
          }
          if (publicTask.available_assets.includes("dsm.tif")) {
            if (metadata[metadataIndex]) {
              odmDatasets.push({
                id: publicTask.id + "-dsm",
                type: "Imagery",
                name: "DSM",
                url: `https://asdc.cloud.edu.au/${metadata[metadataIndex].tiles[0]}?color_map=viridis&rescale=${metadata[metadataIndex].statistics[1].min},${metadata[metadataIndex].statistics[1].max}&hillshade=6`,
                asset: odmAssets[odmAssets.length - 1],
                bounds: metadata[metadataIndex].bounds.value,
                minzoom: metadata[metadataIndex].minzoom,
                maxzoom: metadata[metadataIndex].maxzoom,
                position: {
                  "lng": metadata[metadataIndex].center[0],
                  "lat": metadata[metadataIndex].center[1],
                  "height": metadata[metadataIndex].center[2],//zoom level?
                }
              })
              taskData.push(publicTask.id + "-dsm");
            }
            metadataIndex++;
          }
          if (publicTask.available_assets.includes("dtm.tif")) {
            if (metadata[metadataIndex]) {
              odmDatasets.push({
                id: publicTask.id + "-dtm",
                type: "Imagery",
                name: "DTM",
                url: `https://asdc.cloud.edu.au/${metadata[metadataIndex].tiles[0]}?color_map=viridis&rescale=${metadata[metadataIndex].statistics[1].min},${metadata[metadataIndex].statistics[1].max}&hillshade=6`,
                asset: odmAssets[odmAssets.length - 1],
                bounds: metadata[metadataIndex].bounds.value,
                minzoom: metadata[metadataIndex].minzoom,
                maxzoom: metadata[metadataIndex].maxzoom,
                position: {
                  "lng": metadata[metadataIndex].center[0],
                  "lat": metadata[metadataIndex].center[1],
                  "height": metadata[metadataIndex].center[2],//zoom level?
                }
              })
              taskData.push(publicTask.id + "-dtm");
            }
            metadataIndex++;
          }
          setCategories([{
            "id": -2,
            "name": "Task"
          }])
          if (taskData.length > 0) {
            odmAssets.push({
              "id": 1,
              "name": publicTask.name,
              "status": "active",
              "categoryID": -2,
              "data": taskData,
              project: projectID,
              taskID:publicTask.id
            })
          }

          setAssets(odmAssets);
          setDatasets(odmDatasets);
          resolve();
        })
    })
  }))
}
