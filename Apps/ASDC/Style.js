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
    var tilesetIDs = Object.keys(tilesets[assetID]);
    for (var i = 0; i < tilesetIDs.length; i++) {
      var selectedTileset = tilesets[assetID][tilesetIDs[i]];

      var alpha = 1;
      if (
        selectedTileset &&
        selectedTileset.style &&
        selectedTileset.style.color
      ) {
        if (selectedTileset.style.color.expression) {
          alpha = selectedTileset.style.color.expression
            .match(/\((.*)\)/)
            .pop()
            .split(",")
            .pop()
            .trim();
        } else {
          if (selectedTileset.style.color.conditionsExpression) {
            alpha =
              selectedTileset.style.color.conditionsExpression.conditions[0][1]
                .match(/\((.*)\)/)
                .pop()
                .split(",")
                .pop()
                .trim();
          }
        }
      }

      var schema;
      if (schemaName) {
        setSelectedDimension(schemaName);
        if (
          selectedTileset.asset &&
          selectedTileset.asset.options &&
          selectedTileset.asset.options.dimensions
        ) {
          if (!selectedTileset.asset.options.dimensions.includes(schemaName)) {
            return;
          }
        } else {
          return;
        }

        if (selectedTileset.asset && selectedTileset.asset.ept.schema) {
          selectedTileset.asset.ept.schema.map((_schema) => {
            if (_schema.name === schemaName) {
              schema = _schema;
            }
          });
        } else {
          if (alpha) {
            selectedTileset.style = new Cesium.Cesium3DTileStyle({
              color: `rgba(\${COLOR}.r * 255,\${COLOR}.g* 255,\${COLOR}.b* 255,${alpha})`,
            });
          }
          return;
        }

        if (schema) {
          if (schema.name === "Classification") {
            selectedTileset.style = new Cesium.Cesium3DTileStyle({
              color: {
                conditions: [
                  ["${Classification} === 2", `rgba(153,138,98,${alpha})`],
                  ["${Classification} === 3", `rgba(224,255,137,${alpha})`],
                  ["${Classification} === 4", `rgba(172,218,88,${alpha})`],
                  ["${Classification} === 5", `rgba(48,98,0,${alpha})`],
                  ["${Classification} === 6", `rgba(172,172,172,${alpha})`],
                  ["${Classification} === 9", `rgba(140,204,255,${alpha})`],
                  ["true", `rgba(255,255,255,${alpha})`],
                ],
              },
            });
          } else if (schema.name === "Intensity") {
            selectedTileset.style = new Cesium.Cesium3DTileStyle({
              color: `rgba((\${Intensity}/${
                schema.mean + schema.stddev
              })*255,(\${Intensity}/${
                schema.mean + schema.stddev
              })*255,(\${Intensity}/${
                schema.mean + schema.stddev
              })*255,${alpha})`,
            });
          } else if (
            schema.name === "Red" ||
            schema.name === "Green" ||
            schema.name === "Blue"
          ) {
            selectedTileset.style = new Cesium.Cesium3DTileStyle({
              color: `rgba((\${COLOR} * color('${schema.name.toLowerCase()}')).r *255, (\${COLOR} * color('${schema.name.toLowerCase()}')).g * 255, (\${COLOR} * color('${schema.name.toLowerCase()}')).b * 255, ${alpha})`,
            });
          } else {
            selectedTileset.style = new Cesium.Cesium3DTileStyle({
              color: `hsla((\${${schema.name}}-${schema.minimum})/(${schema.maximum}-${schema.minimum}),1,0.5,${alpha})`,
            });
          }
        } else {
          if (alpha) {
            selectedTileset.style = new Cesium.Cesium3DTileStyle({
              color: `rgba(\${COLOR}.r * 255,\${COLOR}.g* 255,\${COLOR}.b* 255,${alpha})`,
            });
          }
        }
      } else {
        if (alpha) {
          if (
            selectedTileset?.root?.content?.pointsLength
          ) {
            selectedTileset.style = new Cesium.Cesium3DTileStyle({
              color: `rgba(\${COLOR}.r * 255, \${COLOR}.g * 255, \${COLOR}.b * 255,${alpha})`,
            });
          }
        }
      }
    }
  });
};

export const setupStyleToolbar = (tileset) => {
  if (!tileset) return;
  var toolbar = document.getElementById("dims-toolbar");

  while (toolbar.firstChild) {
    toolbar.removeChild(toolbar.firstChild);
  }

  document.getElementById("dims-toolbar-row").style.display = "none";

  if (!tileset.asset || !tileset.asset.ept || !tileset.asset.ept.schema) return;
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

  if (styleToolbarMenu.length <= 1) {
    document.getElementById("dims-toolbar-row").style.display = "none";
  } else {
    document.getElementById("dims-toolbar-row").style.display = "table-row";
    Sandcastle.addToolbarMenu(styleToolbarMenu, "dims-toolbar");

    if (selectedIndex != undefined) {
      document.getElementById("dims-toolbar").childNodes[0].selectedIndex =
        selectedIndex + 1;
    }
  }
};

export const applyAlpha = (alpha, asset, data) => {
  if (isNaN(alpha)) return; //
  if (data.type === "PointCloud" || data.type === "EPTPointCloud") {
    if (tilesets[asset.id] && tilesets[asset.id][data.id]) {
      if (tilesets[asset.id][data.id].ready) {
        tilesets[asset.id][data.id].style = new Cesium.Cesium3DTileStyle({
          color: `rgba(\${COLOR}.r * 255,\${COLOR}.g * 255,\${COLOR}.b * 255,${alpha})`,
        });

        applyStyle(selectedDimension);
      } else {
        tilesets[asset.id][data.id].readyPromise.then((t) => {
          tilesets[asset.id][data.id].style = new Cesium.Cesium3DTileStyle({
            color: `rgba(\${COLOR}.r * 255,\${COLOR}.g * 255,\${COLOR}.b * 255,${alpha})`,
          });

          applyStyle(selectedDimension);
        });
      }
    }
  } else if (data.type === "ModelTileset") {
    if (tilesets[asset.id] && tilesets[asset.id][data.id]) {
      tilesets[asset.id][data.id].style = new Cesium.Cesium3DTileStyle({
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
    if (
      entities[asset.id] &&
      entities[asset.id][data.id] &&
      entities[asset.id][data.id].polygon &&
      entities[asset.id][data.id].polygon.material &&
      entities[asset.id][data.id].polygon.material.color
    ) {
      entities[asset.id][data.id].polygon.material.color._value.alpha = alpha;
      entities[asset.id][data.id].billboard.color._value.alpha = alpha;
    }
  }
};

export const getAlpha = (asset, data) => {
  var alpha = 1;
  if (
    data.type === "PointCloud" ||
    data.type === "EPTPointCloud" ||
    data.type === "ModelTileset"
  ) {
    if (
      tilesets[asset.id] &&
      tilesets[asset.id][data.id] &&
      tilesets[asset.id][data.id].style &&
      tilesets[asset.id][data.id].style.color
    ) {
      if (tilesets[asset.id][data.id].style.color.expression) {
        alpha = tilesets[asset.id][data.id].style.color.expression
          .match(/\((.*)\)/)
          .pop()
          .split(",")
          .pop()
          .trim();
      } else {
        if (tilesets[asset.id][data.id].style.color.conditionsExpression) {
          alpha = tilesets[asset.id][
            data.id
          ].style.color.conditionsExpression.conditions[0][1]
            .match(/\((.*)\)/)
            .pop()
            .split(",")
            .pop()
            .trim();
        }
      }
    } else {
      alpha = undefined;
    }
  } else if (data.type === "Imagery") {
    if (imageryLayers[asset.id] && imageryLayers[asset.id][data.id]) {
      alpha = imageryLayers[asset.id][data.id].alpha;
    } else {
      alpha = undefined;
    }
  } else if (data.type === "Model") {
    if (
      entities[asset.id] &&
      entities[asset.id][data.id] &&
      entities[asset.id][data.id].model.color
    ) {
      alpha = entities[asset.id][data.id].model.color.getValue().alpha;
    }
  } else if (data.type === "GeoJSON") {
    if (dataSources[asset.id] && dataSources[asset.id][data.id]) {
      var entity = dataSources[asset.id][data.id].entities.values[0];
      if (entity) {
        if (entity.polygon) {
          alpha = entity.polygon.material.color.getValue().alpha;
        } else if (entity.polyline) {
          alpha = entity.polyline.material.color.getValue().alpha;
        }
      }
    }
  } else if (data.type === "ImageSeries") {
    if (
      entities[asset.id] &&
      entities[asset.id][data.id] &&
      entities[asset.id][data.id].polygon &&
      entities[asset.id][data.id].polygon.material
    ) {
      alpha =
        entities[asset.id][data.id].polygon.material.color.getValue().alpha;
    }
  }

  return alpha;
};
