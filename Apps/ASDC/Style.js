import {
  selectedDimension,
  setSelectedDimension,
  selectedAssetIDs,
  tilesets,
  imageryLayers,
  entities,
  dataSources,
} from "./State.js";

export const applyStyle = (schemaName) => {
  selectedAssetIDs.map((assetID) => {
    if (!tilesets[assetID]) return;
    var tilesetDates = Object.keys(tilesets[assetID]);
    for (var i = 0; i < tilesetDates.length; i++) {
      var selectedTileset = tilesets[assetID][tilesetDates[i]];
      var schema;
      if (schemaName) {
        if (
          selectedTileset.asset &&
          !selectedTileset.asset.options.dimensions.includes(schemaName)
        ) {
          return;
        }

        if (selectedTileset.asset && selectedTileset.asset.ept.schema) {
          selectedTileset.asset.ept.schema.map((_schema) => {
            if (_schema.name === schemaName) {
              schema = _schema;
            }
          });
        } else {
          selectedTileset.style = null;
          return;
        }

        if (schema) {
          if (schema.name === "Classification") {
            selectedTileset.style = new Cesium.Cesium3DTileStyle({
              color: {
                conditions: [
                  ["${Classification} === 2", "rgb(153,138,98)"],
                  ["${Classification} === 3", "rgb(224,255,137)"],
                  ["${Classification} === 4", "rgb(172,218,88)"],
                  ["${Classification} === 5", "rgb(48,98,0)"],
                  ["${Classification} === 6", "rgb(172,172,172)"],
                  ["${Classification} === 9", "rgb(140,204,255)"],
                  ["true", "rgb(255,255,255)"],
                ],
              },
            });
          } else if (schema.name === "Intensity") {
            selectedTileset.style = new Cesium.Cesium3DTileStyle({
              color: `rgb((\${Intensity}/${
                schema.mean + schema.stddev
              })*255,(\${Intensity}/${
                schema.mean + schema.stddev
              })*255,(\${Intensity}/${schema.mean + schema.stddev})*255)`,
            });
          } else if (
            schema.name === "Red" ||
            schema.name === "Green" ||
            schema.name === "Blue"
          ) {
            selectedTileset.style = new Cesium.Cesium3DTileStyle({
              // color: `\${COLOR} * color('${schema.name.toLowerCase()}')`,
              color: `rgba(\${COLOR}.r * 255,\${COLOR}.g* 255,\${COLOR}.b* 255,0.75)`,
            });
          } else {
            selectedTileset.style = new Cesium.Cesium3DTileStyle({
              color: `hsl((\${${schema.name}}-${schema.minimum})/(${schema.maximum}-${schema.minimum}),1,0.5)`,
            });
          }
        } else {
          selectedTileset.style = null;
        }
      } else {
        selectedTileset.style = null;
      }

      setSelectedDimension(schemaName);
    }
  });
};

export const setupStyleToolbar = (tileset) => {
  var toolbar = document.getElementById("toolbar");

  while (toolbar.firstChild) {
    toolbar.removeChild(toolbar.firstChild);
  }

  if (!tileset.asset || !tileset.asset.ept.schema) return;
  if (tileset.asset && tileset.asset.options.dimensions.length === 0) return;

  var styleToolbarMenu = [
    {
      text: "RGB",
      onselect: () => {
        applyStyle(null, tileset);
      },
    },
  ];

  var selectedIndex;
  var filterList = ["X", "Y", "GpsTime"];
  tileset.asset.ept.schema
    .filter((_schema) => {
      if (
        _schema.minimum != _schema.maximum &&
        !filterList.includes(_schema.name)
      ) {
        return _schema;
      }
    })
    .map((_schema, index) => {
      styleToolbarMenu.push({
        text: _schema.name,
        onselect: () => {
          applyStyle(_schema.name, tileset);
        },
      });
      if (selectedDimension && _schema.name === selectedDimension) {
        selectedIndex = index;
      }
    });

  if (styleToolbarMenu.length === 1) return;
  Sandcastle.addToolbarMenu(styleToolbarMenu);

  if (selectedIndex != undefined) {
    document.getElementById("toolbar").childNodes[0].selectedIndex =
      selectedIndex + 1;
  }
};

export const applyAlpha = (evt, asset, data) => {
  document.getElementById("alpha-value").innerHTML = evt.target.value + " %";
  var alpha = evt.target.value / 100;

  if (data.type === "PointCloud" || data.type === "EPTPointCloud") {
    if (tilesets[asset.id] && tilesets[asset.id][new Date(data.date)]) {
      tilesets[asset.id][new Date(data.date)].style =
        new Cesium.Cesium3DTileStyle({
          color: `rgba(\${COLOR}.r * 255,\${COLOR}.g* 255,\${COLOR}.b* 255,${alpha})`,
        });
    }
  } else if (data.type === "ModelTileset") {
    if (tilesets[asset.id] && tilesets[asset.id][new Date(data.date)]) {
      tilesets[asset.id][new Date(data.date)].style =
        new Cesium.Cesium3DTileStyle({
          color: `rgba(255, 255, 255, ${alpha})`,
        });
    }
  } else if (data.type === "Imagery") {
    if (imageryLayers[asset.id] && imageryLayers[asset.id][data.id]) {
      imageryLayers[asset.id][data.id].alpha = alpha;
    }
  } else if (data.type === "Model") {
    if (entities[asset.id] && entities[asset.id][data.id]) {
      entities[asset.id][data.id].model.color = Cesium.Color.fromAlpha(
        Cesium.Color.WHITE,
        alpha
      );
    }
  } else if (data.type === "GeoJSON") {
    if (dataSources[asset.id] && dataSources[asset.id][data.id]) {
      dataSources[asset.id][data.id].entities.values.map((entity) => {
        if (entity.polygon) {
          entity.polygon.material = Cesium.Color.fromAlpha(
            entity.polygon.material.color.getValue(),
            alpha
          );
        }
        if (entity.polyline) {
          entity.polyline.material = Cesium.Color.fromAlpha(
            entity.polyline.material.color.getValue(),
            alpha
          );
        }
      });
    }
  } else if (data.type === "ImageSeries") {
    if (entities[asset.id] && entities[asset.id][data.id]) {
      entities[asset.id][data.id].rectangle.material.color._value.alpha = alpha;
    }
  }
};
