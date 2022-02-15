import { cesiumIonAccessToken } from "./Constants.js";
import {
  selectedTileset,
  setSelectedTileset,
  selectedDimension,
  viewer,
  setViewer,
  tilesets,
  dataSources,
  selectedAssetID,
  selectedAsset,
  selectedData,
  setSelectedData,
  assets,
} from "./State.js";
import { loadAsset, loadData, setScreenSpaceError } from "./Datasets.js";
import {
  setupSidebar,
  upload,
  addFileInput,
  openModal,
  closeModal,
} from "./Sidebar.js";
import { applyStyle, setupStyleToolbar } from "./PointcloudStyle.js";
import { closeGraphModal } from "./Graphs.js";
import { findAssetAndDataFromUrl, checkAssetStrings } from "./URL.js";

Cesium.Ion.defaultAccessToken = cesiumIonAccessToken;

findAssetAndDataFromUrl();
checkAssetStrings();

Cesium.Camera.DEFAULT_VIEW_RECTANGLE = Cesium.Rectangle.fromDegrees(
  113.338953078,
  -43.6345972634,
  153.569469029,
  -10.6681857235
);

setViewer(
  new Cesium.Viewer("cesiumContainer", {
    terrainProvider: Cesium.createWorldTerrain({ requestWaterMask: true }),
    vrButton: true,
    fullscreenElement: "cesiumContainer",
  })
);
viewer.scene.screenSpaceCameraController.enableCollisionDetection = false;
viewer.scene.globe.depthTestAgainstTerrain = false;

viewer.camera.moveEnd.addEventListener(() => {
  var viewMenu = [];

  var selectedIndex;
  var timeseriesInView = false;

  assets.map((asset) => {
    if (asset.data) {
      asset.data.map((data) => {
        if (data.position) {
          var lng = data.position.lng;
          var lat = data.position.lat;
          var height = data.position.height;

          var dataPosition = Cesium.Cartographic.toCartesian(
            new Cesium.Cartographic.fromDegrees(lng, lat, height)
          );

          var distance = Cesium.Cartesian3.distance(
            viewer.camera.position,
            dataPosition
          );
          if (
            distance <=
            (data.boundingSphereRadius ? data.boundingSphereRadius * 2 : 2000)
          ) {
            viewMenu.push({
              text: data.date
                ? `${asset.name} - ${data.date}`
                : `${asset.name} - No Date`,
              onselect: () => {
                setSelectedData(data);
                if (
                  (tilesets[asset.id] &&
                    tilesets[asset.id][new Date(data.date)] &&
                    tilesets[asset.id][new Date(data.date)] !=
                      selectedTileset) ||
                  !tilesets[asset.id] ||
                  !tilesets[asset.id][new Date(data.date)]
                ) {
                  loadData(asset, data, false, true);
                }
              },
              data: data,
            });
            if (selectedData && selectedData === data) {
              selectedIndex = viewMenu.length - 1;
            }
            if (!selectedData && selectedAsset === asset) {
              timeseriesInView = true;
            }
          }
        }
      });
    }
  });

  var toolbar = document.getElementById("cam-toolbar");

  while (toolbar.firstChild) {
    toolbar.removeChild(toolbar.firstChild);
  }

  if (viewMenu.length > 0) {
    Sandcastle.addToolbarMenu(viewMenu, "cam-toolbar");
    if (selectedIndex) {
      document.getElementById(
        "cam-toolbar"
      ).childNodes[0].selectedIndex = selectedIndex;

      if (selectedData && selectedData != viewMenu[selectedIndex].data) {
        viewMenu[selectedIndex].onselect();
      }
    } else {
      if (
        (selectedData && selectedData != viewMenu[0].data) ||
        !timeseriesInView
      ) {
        viewMenu[0].onselect();
      }
    }
  }
});

setupSidebar();

viewer.clock.onTick.addEventListener((clock) => {
  var currentTime = Cesium.JulianDate.toDate(clock.currentTime).getTime();
  if (tilesets[selectedAssetID]) {
    if (!selectedData) {
      var tilesetDates = Object.keys(tilesets[selectedAssetID]).sort(function (
        a,
        b
      ) {
        return new Date(a).getTime() - new Date(b).getTime();
      });

      for (var i = 0; i < tilesetDates.length; i++) {
        if (
          (i === 0 || new Date(tilesetDates[i]).getTime() <= currentTime) &&
          (i === tilesetDates.length - 1 ||
            new Date(tilesetDates[i + 1]).getTime() > currentTime)
        ) {
          if (Array.isArray(tilesets[selectedAssetID][tilesetDates[i]])) {
            tilesets[selectedAssetID][tilesetDates[i]].map((tileset) => {
              tileset.show = true;
            });
          } else {
            tilesets[selectedAssetID][tilesetDates[i]].show = true;

            if (
              selectedTileset != tilesets[selectedAssetID][tilesetDates[i]] &&
              tilesets[selectedAssetID][tilesetDates[i]]
            ) {
              setupStyleToolbar(tilesets[selectedAssetID][tilesetDates[i]]);
            }

            setSelectedTileset(tilesets[selectedAssetID][tilesetDates[i]]);

            if (selectedTileset.asset && selectedTileset.asset.ept.schema) {
              applyStyle(selectedDimension);
            }
          }
        } else {
          if (Array.isArray(tilesets[selectedAssetID][tilesetDates[i]])) {
            tilesets[selectedAssetID][tilesetDates[i]].map((tileset) => {
              tileset.show = false;
            });
          } else {
            tilesets[selectedAssetID][tilesetDates[i]].show = false;
          }
        }
      }
    } else {
      if (
        selectedData.type === "PointCloud" ||
        selectedData.type === "EPTPointCloud"
      ) {
        if (
          Array.isArray(tilesets[selectedAssetID][new Date(selectedData.date)])
        ) {
          tilesets[selectedAssetID][new Date(selectedData.date)].map(
            (tileset) => {
              tileset.show = true;
            }
          );
        } else {
          tilesets[selectedAssetID][new Date(selectedData.date)].show = true;

          if (
            selectedTileset !=
              tilesets[selectedAssetID][new Date(selectedData.date)] &&
            tilesets[selectedAssetID][new Date(selectedData.date)]
          ) {
            setupStyleToolbar(
              tilesets[selectedAssetID][new Date(selectedData.date)]
            );
          }

          setSelectedTileset(
            tilesets[selectedAssetID][new Date(selectedData.date)]
          );

          if (selectedTileset.asset && selectedTileset.asset.ept.schema) {
            applyStyle(selectedDimension);
          }
        }
      }
    }
  }

  //constant geojsons
  if (dataSources[selectedAssetID]) {
    if (!selectedData) {
      Object.keys(dataSources[selectedAssetID]).map((i) => {
        dataSources[selectedAssetID][i].show = true;
      });
    } else {
      if (
        selectedData.type === "GeoJSON" &&
        dataSources[selectedAssetID][selectedAsset.data.indexOf(selectedData)]
      ) {
        dataSources[selectedAssetID][
          selectedAsset.data.indexOf(selectedData)
        ].show = true;
      }
    }
  }
});

var clickHandler = viewer.screenSpaceEventHandler.getInputAction(
  Cesium.ScreenSpaceEventType.LEFT_CLICK
);
viewer.screenSpaceEventHandler.setInputAction(function onLeftClick(movement) {
  var pickedFeature = viewer.scene
    .drillPick(movement.position)
    .filter((feature) => {
      if (!(feature.primitive instanceof Cesium.Cesium3DTileset))
        return feature;
    })[0];

  if (!Cesium.defined(pickedFeature)) {
    clickHandler(movement);
    return;
  }

  var selectedEntity = pickedFeature.id;

  if (selectedEntity) {
    if (selectedEntity.id.startsWith("marker")) {
      var id = selectedEntity.id.slice("marker_".length);
      window.history.pushState("", "", `/cesium/Apps/ASDC/${id}`);
      assets.map((a) => {
        if (a["id"] === parseInt(id)) {
          loadAsset(a);
          return;
        }
      });
    } else {
      if (selectedEntity.properties) {
        selectedEntity.description =
          '<table class="cesium-infoBox-defaultTable"><tbody>';
        for (
          var i = 0;
          i < selectedEntity.properties._propertyNames.length;
          i++
        ) {
          selectedEntity.description +=
            "<tr><th>" +
            selectedEntity.properties._propertyNames[i] +
            "</th><td>" +
            selectedEntity.properties[
              selectedEntity.properties._propertyNames[i]
            ].getValue() +
            "</td></tr>";
        }
        selectedEntity.description += "</tbody></table>";

        viewer.selectedEntity = selectedEntity;
      }
    }
  }
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

document.getElementById("sidebar-upload-button").onclick = openModal;
document.getElementById("close-upload-modal").onclick = closeModal;
document.getElementById("add-file-button").onclick = addFileInput;
document.getElementById("modal-upload-button").onclick = upload;
document.getElementById("close-graph").onclick = closeGraphModal;
document.getElementById("msse-slider").oninput = setScreenSpaceError;
