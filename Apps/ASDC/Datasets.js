import { selectedTileset,setSelectedTileset, selectedAssetID, setSelectedAsset, setSelectedAssetID, setSelectedData,tilesets,entities,dataSources,viewer,MSSE,setMSSE } from "./State.js";
import { loadGraph, closeGraphModal } from "./Graphs.js";
import { setupStyleToolbar } from "./PointcloudStyle.js";
import {highlightHeightPX, highlightColor} from "./Constants.js"

export const loadAsset = (asset) => {
    if (!asset) return;

    setSelectedAsset(asset);
    setSelectedAssetID(asset["id"]);
    setSelectedData(null);

    Object.keys(tilesets).map((tileset) => {
        Object.keys(tilesets[tileset]).map((date) => {
            tilesets[tileset][date].show = false;
        });
    });

    Object.keys(entities).map((entity) => {
        entities[entity].show = false;
    });

    asset.data?.map((data) => {
        loadData(asset, data, false, false);
    });

    //TODO: dates for entities
    viewer.timeline._highlightRanges = [];
    if (tilesets[selectedAssetID]) {
        var tilesetDates = Object.keys(tilesets[selectedAssetID]);

        tilesetDates.sort(function (a, b) {
            return new Date(a).getTime() - new Date(b).getTime();
        });

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

            setSelectedTileset(tilesets[selectedAssetID][minDate]);

            setupStyleToolbar(tilesets[selectedAssetID][minDate]);
        } else {
            //point clouds with no date
            var currentDate = new Date();
            viewer.clock.currentTime = new Cesium.JulianDate.fromDate(
                new Date()
            );
            viewer.timeline.updateFromClock();
            viewer.timeline.zoomTo(
                Cesium.JulianDate.fromDate(currentDate),
                Cesium.JulianDate.fromDate(
                    new Date(currentDate.getTime() + 86400000)
                )
            );
        }
    } else {
        if (asset.data[0]["type"] === "Influx") {
            //Influx charts from 2 weeks before
            var currentDate = new Date();
            viewer.clock.currentTime = new Cesium.JulianDate.fromDate(
                currentDate
            );
            viewer.timeline.updateFromClock();
            viewer.timeline.zoomTo(
                Cesium.JulianDate.fromDate(
                    new Date(currentDate.getTime() - 2 * 7 * 86400000)
                ),
                Cesium.JulianDate.fromDate(new Date())
            );
        } else {
            //Other data types with no date
            var currentDate = new Date();
            viewer.clock.currentTime = new Cesium.JulianDate.fromDate(
                new Date()
            );
            viewer.timeline.updateFromClock();
            viewer.timeline.zoomTo(
                Cesium.JulianDate.fromDate(currentDate),
                Cesium.JulianDate.fromDate(
                    new Date(currentDate.getTime() + 86400000)
                )
            );
        }
    }

    if (asset.data) {
        if (
            asset.data[0]["type"] === "PointCloud" ||
            asset.data[0]["type"] === "EPTPointCloud"
        ) {
            document.getElementById("msse-slider-container").style.display =
                "block";
        } else {
            document.getElementById("msse-slider-container").style.display =
                "none";
        }

        if (asset.data[0]["type"] === "PointCloud") {
            viewer.flyTo(tilesets[selectedAssetID][tilesetDates[0]]);
        } else if (asset.data[0]["type"] === "Model") {
            viewer.flyTo(entities[selectedAssetID]);
        } else if (asset.data[0]["type"] === "EPTPointCloud") {
            viewer.flyTo(tilesets[selectedAssetID][tilesetDates[0]][0]);
        } else if (asset.data[0]["type"] === "Influx") {
            var position = Cesium.Cartesian3.fromDegrees(
                asset.data[0]["position"]["lng"],
                asset.data[0]["position"]["lat"],
                asset.data[0]["position"]["height"] + 1000
            );

            viewer.camera.flyTo({ destination: position });
        }

        var dataTypes = asset.data.map((data) => data.type);
        if (!dataTypes.includes("Influx")) {
            closeGraphModal();
        }
    }
};

export const loadData = (asset, data, fly, timeline) => {
    setSelectedAsset(asset);
    setSelectedAssetID(asset["id"]);

    setSelectedTileset(null);

    Object.keys(tilesets).map((tileset) => {
        Object.keys(tilesets[tileset]).map((date) => {
            if (Array.isArray(tilesets[tileset][new Date(date)])) {
                tilesets[tileset][new Date(date)].map((tileset) => {
                    tileset.show = false;
                });
            } else {
                tilesets[tileset][new Date(date)].show = false;
            }
        });
    });

    Object.keys(entities).map((entity) => {
        entities[entity].show = false;
    });

    Object.keys(dataSources).map((a) => {
        Object.keys(dataSources[a]).map((i) => {
            dataSources[a][i].show = false;
        });
    });

    if (data["type"] === "PointCloud") {
        if (!tilesets[selectedAssetID]) tilesets[selectedAssetID] = {};
        if (!tilesets[selectedAssetID][new Date(data["date"])]) {
            tilesets[selectedAssetID][
                new Date(data["date"])
            ] = viewer.scene.primitives.add(
                new Cesium.Cesium3DTileset({
                    url: data["url"],
                    maximumScreenSpaceError: MSSE,
                    show: false,
                })
            );
            // tilesets[selectedAssetID][
            //     new Date(data["date"])
            //   ].readyPromise.then(function (tileset) {
            //     console.log(tilesets[selectedAssetID][
            //             new Date(data["date"])
            //             ].boundingSphere);
            //             var carto = Cesium.Cartographic.fromCartesian(tilesets[selectedAssetID][new Date(data["date"])].boundingSphere.center);
            //     console.log(carto.latitude * Cesium.Math.DEGREES_PER_RADIAN);
            //     console.log(carto.longitude * Cesium.Math.DEGREES_PER_RADIAN);
            //     console.log(carto.height);
            //   });

            tilesets[selectedAssetID][new Date(data["date"])].readyPromise.then(
                function (tileset) {
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
                        tileset.modelMatrix = Cesium.Matrix4.fromTranslation(
                            translation
                        );
                    }

                    setupStyleToolbar(tileset);
                }
            );
        }
    } else if (data["type"] === "Model") {
        //TODO: multiple models for same location
        if (!entities[selectedAssetID]) {
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

            entities[selectedAssetID] = viewer.entities.add({
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
            entities[selectedAssetID].show = true;
        }
    } else if (data["type"] === "GeoJSON") {
        loadGeoJson(asset, data, fly);
    } else if (data["type"] === "EPTPointCloud") {
        if (!tilesets[selectedAssetID]) tilesets[selectedAssetID] = {};
        if (!tilesets[selectedAssetID][new Date(data["date"])]) {
            tilesets[selectedAssetID][new Date(data["date"])] = [];
            if (data["date"] === "2019-05-01T00:00:00.000Z") {
                var ilsFile = "/cesium/Apps/may_2019_ils.txt";
            } else {
                var ilsFile = "/cesium/Apps/sept_2019_ils.txt";
            }
            fetch(ilsFile)
                .then((response) => response.text())
                .then((text) =>
                    text.split("\n").map((line, index) => {
                        if (index == 0) return;
                        var path = line.split("C- ")[1];
                        if (path) {
                            tilesets[selectedAssetID][new Date(data["date"])].push(
                                viewer.scene.primitives.add(
                                    new Cesium.Cesium3DTileset({
                                        // url: `http://localhost:3000/tileset.json?ept=https://de.cyverse.org/anon-files${path}/ept.json&truncate`,
                                        // url: `/ept/tileset.json?ept=https://de.cyverse.org/anon-files${path}/ept.json&truncate`,
                                        url: `https://asdc.cloud.edu.au/ept/tileset.json?ept=https://de.cyverse.org/anon-files${path}/ept.json&truncate`,
                                        maximumScreenSpaceError: MSSE,
                                        show: false,
                                    })
                                )
                            );

                            if (index == 1) {
                                viewer.flyTo(
                                    // tilesets[selectedAssetID][new Date("2019-05-01")][0]
                                    tilesets[selectedAssetID][new Date(data["date"])][0]
                                );
                            }
                        }
                    })
                );
        }
    } else if (data["type"] === "Influx") {
        loadGraph(data.station);
    }

    if (data["type"] != "Influx") {
        closeGraphModal();
    }

    if (data["type"] === "PointCloud" || data["type"] === "EPTPointCloud") {
        document.getElementById("msse-slider-container").style.display =
            "block";
    } else {
        document.getElementById("msse-slider-container").style.display =
            "none";
    }

    if (fly) {
        if (data["type"] === "PointCloud") {
            viewer.flyTo(tilesets[selectedAssetID][new Date(data["date"])]);
        } else if (data["type"] === "Model") {
            viewer.flyTo(entities[selectedAssetID]);
        } else if (data["type"] === "EPTPointCloud") {
            viewer.flyTo(tilesets[selectedAssetID][new Date(data["date"])][0]);
        } else if (data["type"] === "Influx") {
            var position = Cesium.Cartesian3.fromDegrees(
                data["position"]["lng"],
                data["position"]["lat"],
                data["position"]["height"] + 1000
            );

            viewer.camera.flyTo({ destination: position });
        }
    }

    if (timeline) {
        var date = new Date(data.date);
        viewer.timeline._highlightRanges = [];

        if (tilesets[selectedAssetID] && tilesets[selectedAssetID][date]) {
            setSelectedTileset(tilesets[selectedAssetID][date]);

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

                setupStyleToolbar(tilesets[selectedAssetID][date]);
            } else {
                //point clouds with no date
                var currentDate = new Date();
                viewer.clock.currentTime = new Cesium.JulianDate.fromDate(
                    new Date()
                );
                viewer.timeline.updateFromClock();
                viewer.timeline.zoomTo(
                    Cesium.JulianDate.fromDate(currentDate),
                    Cesium.JulianDate.fromDate(
                        new Date(currentDate.getTime() + 86400000)
                    )
                );
            }
        } else {
            var toolbar = document.getElementById("toolbar");

            while (toolbar.firstChild) {
                toolbar.removeChild(toolbar.firstChild);
            }

            if (data["type"] === "Influx") {
                //Influx charts from 2 weeks before
                var currentDate = new Date();
                viewer.clock.currentTime = new Cesium.JulianDate.fromDate(
                    currentDate
                );
                viewer.timeline.updateFromClock();
                viewer.timeline.zoomTo(
                    Cesium.JulianDate.fromDate(
                        new Date(currentDate.getTime() - 2 * 7 * 86400000)
                    ),
                    Cesium.JulianDate.fromDate(new Date())
                );
            } else {
                //Other data types with no date
                var currentDate = new Date();
                viewer.clock.currentTime = new Cesium.JulianDate.fromDate(
                    new Date()
                );
                viewer.timeline.updateFromClock();
                viewer.timeline.zoomTo(
                    Cesium.JulianDate.fromDate(currentDate),
                    Cesium.JulianDate.fromDate(
                        new Date(currentDate.getTime() + 86400000)
                    )
                );
            }
        }
    }
};

export const loadGeoJson = (asset, data, fly) => {
    var dataset = data.url;

    if (!dataSources[asset.id]) dataSources[asset.id] = {};
    var dataIndex = asset.data.indexOf(data);
    
    if (!dataSources[asset.id][dataIndex]) {
        var geoJsonPromise = Cesium.GeoJsonDataSource.load(dataset, {
            // clampToGround: true  //issues with picking polygons, using terrain sampling
        });
    
        // viewer.dataSources.add(geoJsonPromise);

        dataSources[asset.id][dataIndex] = new Cesium.CustomDataSource();

        viewer.dataSources.add(dataSources[asset.id][dataIndex]);
        geoJsonPromise.then((dataSource) => {
            var entities = dataSource.entities.values;
            var samplePromises = [];

            dataSource.entities.values.map((entity) => {
                // dataSource.entities.values.slice(0,24).map((entity) => {
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
                        // var polygonEntity = viewer.entities.add({
                        var polygonEntity = dataSources[asset.id][
                            dataIndex
                        ].entities.add({
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
            });
            Promise.all(samplePromises).then(() => {
                dataSource=null;
                geoJsonPromise=null;
                if (fly) {
                    viewer.flyTo(dataSources[asset.id][asset.data.indexOf(data)]);
                    document.getElementById("msse-slider-container").style.display =
                        "none";
                }
            });
        });
    } else {
        dataSources[asset.id][dataIndex].show = true;
        if (fly) {
            viewer.flyTo(dataSources[asset.id][dataIndex]);
            document.getElementById("msse-slider-container").style.display =
                "none";
        }
        // Cesium.when(viewer.dataSourceDisplay.ready, function () {
        //     var boundingSpheres=[];
        //     var entities = dataSources[asset.id][asset.data.indexOf(data)].entities.values;
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
        //     var fullCarto = Cesium.Cartographic.fromCartesian(full.center)
        //     console.log(fullCarto);
        //     console.log(fullCarto.longitude * Cesium.Math.DEGREES_PER_RADIAN);
        //     console.log(fullCarto.latitude * Cesium.Math.DEGREES_PER_RADIAN);
        //   });
    }
};

export const setScreenSpaceError = (evt) => {
    setMSSE(evt.target.value);

    document.getElementById("msse-value").innerHTML = MSSE;

    selectedTileset.maximumScreenSpaceError = MSSE;

    Object.keys(tilesets).map((tileset) => {
        Object.keys(tilesets[tileset]).map((date) => {
            if (Array.isArray(tilesets[tileset][new Date(date)])) {
                tilesets[tileset][new Date(date)].map((tileset) => {
                    tileset.maximumScreenSpaceError = MSSE;
                });
            } else {
                tilesets[tileset][new Date(date)].maximumScreenSpaceError = MSSE;
            }
        });
    });
};