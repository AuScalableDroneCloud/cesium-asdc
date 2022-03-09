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
} from "./State.js";
import { loadGraph, closeGraphModal } from "./Graphs.js";
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

  if (tilesets[asset["id"]]) {
    var tilesetDates = Object.keys(tilesets[asset["id"]]);

    tilesetDates.sort(function (a, b) {
      return new Date(a).getTime() - new Date(b).getTime();
    });

    viewer.clock.currentTime = new Cesium.JulianDate.fromDate(
      new Date(tilesetDates[0])
    );
  }
  if (timeline) {
    if (tilesets[asset["id"]]) {
      //TODO: dates for entities
      viewer.timeline._highlightRanges = [];
      tilesetDates.map((date) => {
        viewer.timeline
          .addHighlightRange(highlightColor, highlightHeightPX)
          .setRange(
            Cesium.JulianDate.fromDate(new Date(date)),
            Cesium.JulianDate.fromDate(
              new Date(new Date(date).getTime() + 86400000)
            )
          );
      });

      var minDate = new Date(tilesetDates[0]);
      var maxDate = new Date(tilesetDates[tilesetDates.length - 1]);

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
      if (assetDataset[0]["type"] === "Influx") {
        //Influx charts from 2 weeks before
        var currentDate = new Date();
        viewer.clock.currentTime = new Cesium.JulianDate.fromDate(currentDate);
        viewer.timeline.updateFromClock();
        viewer.timeline.zoomTo(
          Cesium.JulianDate.fromDate(
            new Date(currentDate.getTime() - 2 * 7 * 86400000)
          ),
          Cesium.JulianDate.fromDate(new Date())
        );
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
    if (
      assetDataset[0]["type"] === "PointCloud" ||
      assetDataset[0]["type"] === "EPTPointCloud" ||
      assetDataset[0]["type"] === "ModelTileset"
    ) {
      document.getElementById("msse-slider-container").style.display = "block";
    } else {
      document.getElementById("msse-slider-container").style.display = "none";
    }

    if (
      assetDataset[0]["type"] === "PointCloud" ||
      assetDataset[0]["type"] === "EPTPointCloud" ||
      assetDataset[0]["type"] === "ModelTileset"
    ) {
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
    } else if (assetDataset[0]["type"] === "Model") {
      viewer.flyTo(entities[asset["id"]][assetDataset[0]["id"]]);
    } else if (
      assetDataset[0]["type"] === "Influx" ||
      assetDataset[0]["type"] === "ImageSeries"
    ) {
      var position = Cesium.Cartesian3.fromDegrees(
        assetDataset[0]["position"]["lng"],
        assetDataset[0]["position"]["lat"],
        assetDataset[0]["position"]["height"] + 1750
      );

      viewer.camera.flyTo({ destination: position });
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

  if (data["type"] === "PointCloud" || data["type"] === "ModelTileset") {
    if (!tilesets[asset["id"]]) tilesets[asset["id"]] = {};
    if (!tilesets[asset["id"]][new Date(data["date"])]) {
      tilesets[asset["id"]][new Date(data["date"])] =
        viewer.scene.primitives.add(
          new Cesium.Cesium3DTileset({
            url: !data.useProxy
              ? data["url"]
              : new Cesium.Resource({
                  url: data["url"],
                  proxy: new Cesium.DefaultProxy("/cesium/proxy/"),
                }),
            maximumScreenSpaceError:
              ((100 - MSSE) / 100) * viewer.canvas.height * 0.25,
            // show: new Date(data["date"]) != "Invalid Date" ? false : true,
          })
        );
      // tilesets[asset["id"]][
      //     new Date(data["date"])
      //   ].readyPromise.then(function (tileset) {
      //     console.log(tilesets[asset["id"]][
      //             new Date(data["date"])
      //             ].boundingSphere);
      //             var carto = Cesium.Cartographic.fromCartesian(tilesets[asset["id"]][new Date(data["date"])].boundingSphere.center);
      //     console.log(carto.latitude * Cesium.Math.DEGREES_PER_RADIAN);
      //     console.log(carto.longitude * Cesium.Math.DEGREES_PER_RADIAN);
      //     console.log(carto.height);
      //   });

      tilesets[asset["id"]][new Date(data["date"])].readyPromise.then(function (
        tileset
      ) {
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
      tilesets[asset["id"]][new Date(data["date"])].show = true;
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
    if (!tilesets[asset["id"]][new Date(data["date"])]) {
      var eptURL;
      if (Array.isArray(data.url)) {
        eptURL = data.url[0];
        tilesets[asset["id"]][new Date(data["date"])] = [];
      } else {
        eptURL = data.url;
      }
      fetch(eptURL, { cache: "no-store" })
        .then((response) => response.text())
        .then((text) => {
          var ept = JSON.parse(text);
          var dimensions = [];
          var truncate = true;
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
              tilesets[asset["id"]][new Date(data["date"])].push(
                viewer.scene.primitives.add(
                  new Cesium.Cesium3DTileset({
                    url: `${eptServer}/tileset.json?ept=${url}&dimensions=${dimensions.join(
                      ","
                    )}&${truncate ? "truncate" : null}`,
                    maximumScreenSpaceError:
                      ((100 - MSSE) / 100) * viewer.canvas.height * 0.25,
                    show:
                      new Date(data["date"]) != "Invalid Date" ? false : true,
                  })
                )
              );
              if (index == 0) {
                tilesets[asset["id"]][
                  new Date(data["date"])
                ][0].readyPromise.then(function (tileset) {
                  setupStyleToolbar(tileset);
                  applyStyle(selectedDimension);
                });
              }
            });
          } else {
            tilesets[asset["id"]][new Date(data["date"])] =
              viewer.scene.primitives.add(
                new Cesium.Cesium3DTileset({
                  url: `${eptServer}/tileset.json?ept=${
                    data.url
                  }&dimensions=${dimensions.join(",")}&${
                    truncate ? "truncate" : null
                  }`,
                  maximumScreenSpaceError:
                    ((100 - MSSE) / 100) * viewer.canvas.height * 0.25,
                  show: new Date(data["date"]) != "Invalid Date" ? false : true,
                })
              );
            tilesets[asset["id"]][new Date(data["date"])].readyPromise.then(
              function (tileset) {
                // console.log(tilesets[asset["id"]][
                //   new Date(data["date"])
                //   ].boundingSphere);
                // var carto = Cesium.Cartographic.fromCartesian(tilesets[asset["id"]][new Date(data["date"])].boundingSphere.center);
                // console.log(carto.latitude * Cesium.Math.DEGREES_PER_RADIAN);
                // console.log(carto.longitude * Cesium.Math.DEGREES_PER_RADIAN);
                // console.log(carto.height);

                setupStyleToolbar(tileset);
                applyStyle(selectedDimension);
              }
            );
          }
        });
    } else {
      if (Array.isArray(data.url)) {
        tilesets[asset["id"]][new Date(data["date"])].map((t) => {
          t.show = true;
        });
      } else {
        tilesets[asset["id"]][new Date(data["date"])].show = true;
      }
    }
  } else if (data["type"] === "Influx") {
    document.getElementById("graphs-modal").style.display = "block";
    loadGraph(data);
  } else if (data["type"] === "Imagery") {
    if (!imageryLayers[asset.id]) imageryLayers[asset.id] = {};
    if (!imageryLayers[asset.id][data.id]) {
      imageryLayers[asset.id][data.id] =
        viewer.imageryLayers.addImageryProvider(
          new Cesium.UrlTemplateImageryProvider({
            url: data.url,
            rectangle: new Cesium.Rectangle.fromDegrees(
              data.bounds[0],
              data.bounds[1],
              data.bounds[2],
              data.bounds[3]
            ),
            minimumLevel: data.minzoom,
            maximumLevel: data.maxzoom,
          })
        );
    } else {
      viewer.imageryLayers.raiseToTop(imageryLayers[asset.id][data.id]);
      imageryLayers[asset.id][data.id].show = true;
    }
  } else if (data["type"] === "ImageSeries") {
    document.getElementById("image-series-toolbar").style.display = "block";
    if (!entities[asset.id]) entities[asset.id] = {};
    if (!entities[asset.id][data.id]) {
      var currentDate = Cesium.JulianDate.toDate(viewer.clock.currentTime);

      if (currentDate.getHours() < 12) {
        currentDate.setDate(currentDate.getDate() - 1);
      }
      currentDate.setHours(12, 0, 0);

      var halfWidth = (0.0025 * 960) / 720;
      var halfHeight = 0.0025;
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
          entities[asset.id][data.id] = viewer.entities.add({
            rectangle: {
              coordinates: Cesium.Rectangle.fromDegrees(
                data.position["lng"] - halfWidth,
                data.position["lat"],
                data.position["lng"] + halfWidth,
                data.position["lat"] + 2 * halfHeight
              ),
              material: new Cesium.ImageMaterialProperty({
                image: imageUrl,
                color: new Cesium.Color.fromAlpha(Cesium.Color.WHITE, 1),
              }),
              show: !billboard,
            },
            position: Cesium.Cartesian3.fromDegrees(
              data.position["lng"],
              data.position["lat"]
            ),
            billboard: {
              image: imageUrl,
              height: 300,
              width: (300 * 960) / 720,
              pixelOffset: new Cesium.Cartesian2(0, -150),
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
                0,
                5000
              ),
              show: billboard,
            },
          });
        })
        .catch((error) => {
          console.log(error);
        });
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
    document.getElementById("msse-slider-container").style.display = "block";
  } else {
    document.getElementById("msse-slider-container").style.display = "none";
  }

  if (fly) {
    var assetDataset = [];
    asset.data?.map((dataID) => {
      for (var i = 0; i < datasets.length; i++) {
        if (datasets[i].id === dataID) {
          assetDataset.push(datasets[i]);
          break;
        }
      }
    });

    if (
      assetDataset[0]["type"] === "PointCloud" ||
      assetDataset[0]["type"] === "EPTPointCloud" ||
      assetDataset[0]["type"] === "ModelTileset"
    ) {
      // if (assetDataset[0].position && assetDataset[0].boundingSphereRadius){
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
      // }
      // else {
      //   viewer.flyTo(tilesets[asset["id"]][new Date(data["date"])])
      // }
    } else if (assetDataset[0]["type"] === "Model") {
      viewer.flyTo(entities[asset["id"]][data["id"]]);
    } else if (
      assetDataset[0]["type"] === "Influx" ||
      assetDataset[0]["type"] === "ImageSeries"
    ) {
      var position = Cesium.Cartesian3.fromDegrees(
        assetDataset[0]["position"]["lng"],
        assetDataset[0]["position"]["lat"],
        assetDataset[0]["position"]["height"] + 1750
      );

      viewer.camera.flyTo({ destination: position });
    } else if (assetDataset[0]["type"] === "Imagery") {
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

  if (timeline) {
    var date = new Date(data.date);
    viewer.timeline._highlightRanges = [];
    viewer.timeline._makeTics();
    if (tilesets[asset["id"]] && tilesets[asset["id"]][date]) {
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
        if (data["type"] === "PointCloud" || data["type"] === "EPTPointCloud") {
          setupStyleToolbar(tilesets[asset["id"]][date]);
        }
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
      if (data["type"] === "Influx") {
        //Influx charts from 2 weeks before
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
          document.getElementById("msse-slider-container").style.display =
            "none";
        }
      });
    });
  } else {
    dataSources[asset.id][dataID].show = true;
    if (fly) {
      viewer.flyTo(dataSources[asset.id][dataID]);
      document.getElementById("msse-slider-container").style.display = "none";
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
    Object.keys(tilesets[tileset]).map((date) => {
      if (Array.isArray(tilesets[tileset][new Date(date)])) {
        tilesets[tileset][new Date(date)].map((t) => {
          //   tileset.maximumScreenSpaceError = MSSE;
          t.maximumScreenSpaceError =
            ((100 - MSSE) / 100) * viewer.canvas.height * 0.25;
          if (MSSE === 0) {
            t.show = false;
          }
        });
      } else {
        // tilesets[tileset][new Date(date)].maximumScreenSpaceError = MSSE;
        tilesets[tileset][new Date(date)].maximumScreenSpaceError =
          ((100 - MSSE) / 100) * viewer.canvas.height * 0.25;
        if (MSSE === 0) {
          tilesets[tileset][new Date(date)].show = false;
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
      context.fillRect(0, renderState.y, renderState.timeBarWidth, this.height);
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
        context.fillRect(
          start,
          renderState.y,
          Math.max(stop - start, 1),
          this.height
        );
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
