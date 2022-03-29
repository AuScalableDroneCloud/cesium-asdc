/*eslint-env node*/
/* eslint-disable no-unused-vars */
/* eslint-disable global-require */
"use strict";
(function () {
  const express = require("express");
  const compression = require("compression");
  const fs = require("fs");
  const url = require("url");
  const request = require("request");
  const Influx = require("influx");
  const path = require("path");
  const fetch = (...args) =>import('node-fetch').then(({ default: fetch }) => fetch(...args));
  const JSON5 = require('json5');
  const Cesium = require('cesium');

  const influx = new Influx.InfluxDB({
    database: "main",
    host: "influxdb.amrf.org.au",
    protocol: "https",
    username: "anonymous",
    password: "password",
  });

  const gzipHeader = Buffer.from("1F8B08", "hex");

  const yargs = require("yargs").options({
    port: {
      default: 8080,
      description: "Port to listen on.",
    },
    public: {
      type: "boolean",
      description: "Run a public server that listens on all interfaces.",
    },
    "upstream-proxy": {
      description:
        'A standard proxy server that will be used to retrieve data.  Specify a URL including port, e.g. "http://proxy:8000".',
    },
    "bypass-upstream-proxy-hosts": {
      description:
        'A comma separated list of hosts that will bypass the specified upstream_proxy, e.g. "lanhost1,lanhost2"',
    },
    help: {
      alias: "h",
      type: "boolean",
      description: "Show this help.",
    },
    production: {
      type: "boolean",
      description: "Serve the build folder",
    },
  });
  const argv = yargs.argv;

  if (argv.help) {
    return yargs.showHelp();
  }

  // eventually this mime type configuration will need to change
  // https://github.com/visionmedia/send/commit/d2cb54658ce65948b0ed6e5fb5de69d022bef941
  // *NOTE* Any changes you make here must be mirrored in web.config.
  const mime = express.static.mime;
  mime.define(
    {
      "application/json": ["czml", "json", "geojson", "topojson"],
      "application/wasm": ["wasm"],
      "image/ktx2": ["ktx2"],
      "model/gltf+json": ["gltf"],
      "model/gltf-binary": ["bgltf", "glb"],
      "application/octet-stream": [
        "b3dm",
        "pnts",
        "i3dm",
        "cmpt",
        "geom",
        "vctr",
      ],
      "text/plain": ["glsl"],
    },
    true
  );

  const app = express();
  app.use(compression());
  app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept"
    );
    next();
  });
  // app.use(cookieParser())

  function checkGzipAndNext(req, res, next) {
    const reqUrl = url.parse(req.url, true);
    const filePath = reqUrl.pathname.substring(1);

    const readStream = fs.createReadStream(filePath, { start: 0, end: 2 });
    readStream.on("error", function (err) {
      next();
    });

    readStream.on("data", function (chunk) {
      if (chunk.equals(gzipHeader)) {
        res.header("Content-Encoding", "gzip");
      }
      next();
    });
  }

  const knownTilesetFormats = [
    /\.b3dm/,
    /\.pnts/,
    /\.i3dm/,
    /\.cmpt/,
    /\.glb/,
    /\.geom/,
    /\.vctr/,
    /tileset.*\.json$/,
  ];
  app.get(knownTilesetFormats, checkGzipAndNext);

  app.use(
    "/cesium/Build/Cesium/Workers",
    express.static(
      path.join(
        __dirname,
        "node_modules",
        "cesium",
        "Build",
        "Cesium",
        "Workers"
      ),
      {
        extensions: ["html", "htm"],
        setHeaders: function (res, path, stat) {
          res.set("Cache-control", `no-store`);
        },
      }
    )
  );

  app.use(
    "/cesium",
    express.static(path.join(__dirname, "node_modules", "cesium"), {
      extensions: ["html", "htm"],
    })
  );

  app.use(
    "/cesium",
    express.static(
      argv.production ? path.join(__dirname, "build") : __dirname,
      {
        extensions: ["html", "htm"],
      }
    )
  );

  app.use('/cesium/proj4', 
    express.static(path.join(__dirname, "node_modules", "proj4", "dist"))
  );

  app.get("/cesium/Apps/ASDC/:dataIDs", function (req, res, next) {
    res.sendFile(
      argv.production
        ? __dirname + "/build/Apps/ASDC/index.html"
        : __dirname + "/Apps/ASDC/index.html"
    );
  });

  app.get("/cesium/Apps/ASDC/Uploads/:dataIDs", function (req, res, next) {
    res.sendFile(
      argv.production
        ? __dirname + "/build/Apps/ASDC/index.html"
        : __dirname + "/Apps/ASDC/index.html"
    );
  });

  function getRemoteUrlFromParam(req) {
    let remoteUrl = req.params[0];
    if (remoteUrl) {
      // add http:// to the URL if no protocol is present
      if (!/^https?:\/\//.test(remoteUrl)) {
        remoteUrl = "http://" + remoteUrl;
      }
      remoteUrl = url.parse(remoteUrl);
      // copy query string
      remoteUrl.search = url.parse(req.url).search;
    }
    return remoteUrl;
  }

  const dontProxyHeaderRegex =
    /^(?:Host|Proxy-Connection|Connection|Keep-Alive|Transfer-Encoding|TE|Trailer|Proxy-Authorization|Proxy-Authenticate|Upgrade)$/i;

  function filterHeaders(req, headers) {
    const result = {};
    // filter out headers that are listed in the regex above
    Object.keys(headers).forEach(function (name) {
      if (!dontProxyHeaderRegex.test(name)) {
        result[name] = headers[name];
      }
    });
    return result;
  }

  const upstreamProxy = argv["upstream-proxy"];
  const bypassUpstreamProxyHosts = {};
  if (argv["bypass-upstream-proxy-hosts"]) {
    argv["bypass-upstream-proxy-hosts"].split(",").forEach(function (host) {
      bypassUpstreamProxyHosts[host.toLowerCase()] = true;
    });
  }

  app.get("/cesium/proxy/*", function (req, res, next) {
    // look for request like http://localhost:8080/proxy/http://example.com/file?query=1
    let remoteUrl = getRemoteUrlFromParam(req);
    if (!remoteUrl) {
      // look for request like http://localhost:8080/proxy/?http%3A%2F%2Fexample.com%2Ffile%3Fquery%3D1
      remoteUrl = Object.keys(req.query)[0];
      if (remoteUrl) {
        remoteUrl = url.parse(remoteUrl);
      }
    }

    if (!remoteUrl) {
      return res.status(400).send("No url specified.");
    }

    if (!remoteUrl.protocol) {
      remoteUrl.protocol = "http:";
    }

    let proxy;
    if (upstreamProxy && !(remoteUrl.host in bypassUpstreamProxyHosts)) {
      proxy = upstreamProxy;
    }

    // encoding : null means "body" passed to the callback will be raw bytes

    request.get(
      {
        url: url.format(remoteUrl),
        headers: filterHeaders(req, req.headers),
        encoding: null,
        proxy: proxy,
      },
      function (error, response, body) {
        let code = 500;

        if (response) {
          code = response.statusCode;
          res.header(filterHeaders(req, response.headers));
        }

        res.status(code).send(body);
      }
    );
  });

  app.get("/cesium/influx/fivemin", (request, response) => {
    influx
      .query(
        `
        select mean("PAR") AS mean_PAR, 
        mean("Total_Solar_Radiation") AS mean_TSR, 
        mean(/Soil_VWC/), 
        mean(/Soil_Temp_*/),
        mean(/Soil_EC_*/),
        mean("Mast_Air_Temp") AS "mean_Air_Temperature", 
        mean("Mast_RH") AS "mean_Relative_Humidity",
        sum("Rain") AS "sum_Rain",
        mean("Snow_Depth") AS "mean_Snow_Depth",
        mean("Battery_Voltage") AS mean_Battery_Voltage 
        from cr1000x where time >= ${request.query.time}ms-2w and time <= ${request.query.time}ms and ("station_name"= \'${request.query.station}\') group by time(5m)
      `
      )
      .then((result) => {
        response.status(200).json(result);
      })
      .catch((error) => response.status(500).json({ error }));
  });

  app.get("/cesium/influx/fivemin2w", (request, response) => {
    influx
      .query(
        `
        select mean("PAR") AS mean_PAR, 
        mean("Total_Solar_Radiation") AS mean_TSR, 
        mean(/Soil_VWC/), 
        mean(/Soil_Temp_*/),
        mean(/Soil_EC_*/),
        mean("Mast_Air_Temp") AS "mean_Air_Temperature", 
        mean("Mast_RH") AS "mean_Relative_Humidity",
        sum("Rain") AS "sum_Rain",
        mean("Snow_Depth") AS "snow_Depth_Mean",
        mean("Battery_Voltage") AS mean_Battery_Voltage 
        from cr1000x where time >= now()-2w and ("station_name"= \'${request.query.station}\') group by time(5m)
      `
      )
      .then((result) => {
        response.status(200).json(result);
      })
      .catch((error) => response.status(500).json({ error }));
  });

  app.get("/cesium/influx/daily", (request, response) => {
    influx
      .query(
        `
        select 
        sum("Rain") AS "sum_Rain" 
        from cr1000x where time >= ${request.query.time}ms-2w and time <= ${request.query.time}ms and ("station_name"= \'${request.query.station}\') group by time(1d)
      `
      )
      .then((result) => {
        response.status(200).json(result);
      })
      .catch((error) => response.status(500).json({ error }));
  });

  app.get("/cesium/influx/daily2w", (request, response) => {
    influx
      .query(
        `
        select 
        sum("Rain") AS "sum_Rain" 
        from cr1000x where time >= now()-2w and ("station_name"= \'${request.query.station}\') group by time(1d)
      `
      )
      .then((result) => {
        response.status(200).json(result);
      })
      .catch((error) => response.status(500).json({ error }));
  });

  app.get("/cesium/influx/images", (request, response) => {
    influx
      .query(
        `
        select time,file_bytes,camera_name,org_name
        from image_metrics where time <= ${request.query.time}ms and time>=${request.query.startTime}ms and camera_name =~ /^${request.query.camera}$/ ORDER BY time DESC LIMIT 1
      `
      )
      .then((result) => {
        response.status(200).json(result);
      })
      .catch((error) => {
        response.status(500);
      });
  });

  app.get("/cesium/terriaCatalog.json", (req, res) => {
    const eptServer = "https://asdc.cloud.edu.au/ept";
    // const eptServer = "http://localhost:3000";
    //todo: error handling
    fetch("https://appf-anu.s3.ap-southeast-2.amazonaws.com/Cesium/asdc_terria.json")
    .then(response => {
      if (response.status === 200) {
        return response.text()
      }
    })
    .then(catalogText => {
      var catalogJson = JSON5.parse(catalogText);
      var webODMgroup = {
        "type": "group",
        "name": "WebODM Projects",
        "members": []
      };
      fetch("https://asdc.cloud.edu.au/api/projects/?ordering=-created_at", {
        headers: { Cookie: req.headers.cookie }
      })
      .then(response => {
        if (response.status === 200) {
          return response.json()
        }
      })
      .then((odmProjects) => {
        if (!odmProjects) {
          res.status(404).json("No projects were found");
          return;
        }
        var taskInfoPromises = [];
        var metaDataPromises = [];
        if (Array.isArray(odmProjects)) {
          odmProjects.map((project) => {
            webODMgroup.members.push({
              "type": "group",
              "name": project.name,
              "members": []
            })
            taskInfoPromises.push(fetch(`https://asdc.cloud.edu.au/api/projects/${project.id}/tasks/?ordering=-created_at`, {
              headers: { Cookie: req.headers.cookie }
            }).then(response => response.json()));
          })
          Promise.all(taskInfoPromises).then((taskInfos, taskIndex) => {
            if (Array.isArray(odmProjects)) {
              odmProjects.map((project, projectIndex) => {
                taskInfos[projectIndex].map(task => {
                  if (task.available_assets.includes("georeferenced_model.laz")) {
                    metaDataPromises.push(fetch(`https://asdc.cloud.edu.au/api/projects/${project.id}/tasks/${task.id}/assets/entwine_pointcloud/ept.json`, {
                      headers: { Cookie: req.headers.cookie }
                    }).then(response => response.json()).catch((e) => {
                      console.log(e);
                    }))
                  }
                  if (task.available_assets.includes("orthophoto.tif")) {
                    metaDataPromises.push(fetch(`https://asdc.cloud.edu.au/api/projects/${project.id}/tasks/${task.id}/orthophoto/metadata`, {
                      headers: { Cookie: req.headers.cookie }
                    }).then(response => response.json()).catch((e) => {
                      console.log(e);
                    }))
                  }
                  if (task.available_assets.includes("dsm.tif")) {
                    metaDataPromises.push(fetch(`https://asdc.cloud.edu.au/api/projects/${project.id}/tasks/${task.id}/dsm/metadata`, {
                      headers: { Cookie: req.headers.cookie }
                    }).then(response => response.json()).catch((e) => {
                      console.log(e);
                    }))
                  }
                  if (task.available_assets.includes("dtm.tif")) {
                    metaDataPromises.push(fetch(`https://asdc.cloud.edu.au/api/projects/${project.id}/tasks/${task.id}/dtm/metadata`, {
                      headers: { Cookie: req.headers.cookie }
                    }).then(response => response.json()).catch((e) => {
                      console.log(e);
                    }))
                  }
                })
              })
            }
            
            Promise.all(metaDataPromises).then((metadata) => {
              var metadataIndex = 0;
              var centers = [];
              var samplePromises = [];
              var terrainProvider = Cesium.createWorldTerrain();
              if (Array.isArray(odmProjects)) {
                odmProjects.map((project, projectIndex) => {
                  taskInfos[projectIndex].map((task, taskIndex) => {
                    var taskMember = {
                      "type": "group",
                      "name": task.name,
                      "members": []
                    };
                    
                    if (task.available_assets.includes("georeferenced_model.laz")) {
                      if (metadata[metadataIndex]) {
                        var truncate = true;
                        if (!metadata[metadataIndex].schema) return
                        metadata[metadataIndex].schema.map((s) => {
                          if (s.name === "Red" || s.name === "Green" || s.name === "Blue") {
                            if (s.maximum && s.maximum <= 255) {
                              truncate = false;
                            }
                          }
                        });
                        taskMember.members.push({
                          "type": "3d-tiles",
                          "name": task.name + " - Point Cloud",
                          "url":`${eptServer}/tileset.json?ept=${`https://asdc.cloud.edu.au/api/projects/${project.id}/tasks/${task.id}/assets/entwine_pointcloud/ept.json`}&${truncate ? "truncate" : null}`
                        })
                      }
                      metadataIndex++;
                    }

                    if (task.available_assets.includes("orthophoto.tif")) {
                      if (metadata[metadataIndex]) {
                        centers.push(new Cesium.Cartographic.fromDegrees(metadata[metadataIndex].center[0],metadata[metadataIndex].center[1]))
                        var rectangle = new Cesium.Rectangle.fromDegrees(
                          metadata[metadataIndex].bounds.value[0],
                          metadata[metadataIndex].bounds.value[1],
                          metadata[metadataIndex].bounds.value[2],
                          metadata[metadataIndex].bounds.value[3]
                        );
                        const cartographics = [
                          Cesium.Rectangle.center(rectangle),
                          Cesium.Rectangle.southeast(rectangle),
                          Cesium.Rectangle.southwest(rectangle),
                          Cesium.Rectangle.northeast(rectangle),
                          Cesium.Rectangle.northwest(rectangle),
                        ];

                        samplePromises.push(Cesium.sampleTerrainMostDetailed(
                          terrainProvider,
                          cartographics
                        ))

                        taskMember.members.push({
                          "type": "open-street-map",
                          "name": task.name + " - Orthophoto",
                          "url":`https://asdc.cloud.edu.au/api/projects/${project.id}/tasks/${task.id}/orthophoto/tiles?rescale=${metadata[metadataIndex].statistics[1].min},${metadata[metadataIndex].statistics[1].max}`,
                          "maximumLevel": metadata[metadataIndex].maxzoom,
                          "rectangle":{
                            west:metadata[metadataIndex].bounds.value[0],
                            south:metadata[metadataIndex].bounds.value[1],
                            east:metadata[metadataIndex].bounds.value[2],
                            north:metadata[metadataIndex].bounds.value[3]
                          },
                          "idealZoom":{
                            "lookAt":{
                              "targetLongitude" :metadata[metadataIndex].center[0],
                              "targetLatitude" :metadata[metadataIndex].center[1],
                            }
                          }
                        })
                      }
                      metadataIndex++;
                    }
                    if (task.available_assets.includes("dsm.tif")) {
                      if (metadata[metadataIndex]) {
                        centers.push(new Cesium.Cartographic.fromDegrees(metadata[metadataIndex].center[0],metadata[metadataIndex].center[1]))
                        var rectangle = new Cesium.Rectangle.fromDegrees(
                          metadata[metadataIndex].bounds.value[0],
                          metadata[metadataIndex].bounds.value[1],
                          metadata[metadataIndex].bounds.value[2],
                          metadata[metadataIndex].bounds.value[3]
                        );
                        const cartographics = [
                          Cesium.Rectangle.center(rectangle),
                          Cesium.Rectangle.southeast(rectangle),
                          Cesium.Rectangle.southwest(rectangle),
                          Cesium.Rectangle.northeast(rectangle),
                          Cesium.Rectangle.northwest(rectangle),
                        ];

                        samplePromises.push(Cesium.sampleTerrainMostDetailed(
                          terrainProvider,
                          cartographics
                        ))
                        taskMember.members.push({
                          "type": "open-street-map",
                          "name": task.name + " - DSM",
                          "url":`https://asdc.cloud.edu.au/api/projects/${project.id}/tasks/${task.id}/dsm/tiles?color_map=viridis&rescale=${metadata[metadataIndex].statistics[1].min},${metadata[metadataIndex].statistics[1].max}&hillshade=6`,
                          "maximumLevel": metadata[metadataIndex].maxzoom,
                          "rectangle":{
                            west:metadata[metadataIndex].bounds.value[0],
                            south:metadata[metadataIndex].bounds.value[1],
                            east:metadata[metadataIndex].bounds.value[2],
                            north:metadata[metadataIndex].bounds.value[3]
                          },
                          "idealZoom":{
                            "lookAt":{
                              "targetLongitude" :metadata[metadataIndex].center[0],
                              "targetLatitude" :metadata[metadataIndex].center[1],
                            }
                          }
                        })
                      }
                      metadataIndex++;
                    }
                    if (task.available_assets.includes("dtm.tif")) {
                      if (metadata[metadataIndex]) {
                        centers.push(new Cesium.Cartographic.fromDegrees(metadata[metadataIndex].center[0],metadata[metadataIndex].center[1]))
                        var rectangle = new Cesium.Rectangle.fromDegrees(
                          metadata[metadataIndex].bounds.value[0],
                          metadata[metadataIndex].bounds.value[1],
                          metadata[metadataIndex].bounds.value[2],
                          metadata[metadataIndex].bounds.value[3]
                        );
                        const cartographics = [
                          Cesium.Rectangle.center(rectangle),
                          Cesium.Rectangle.southeast(rectangle),
                          Cesium.Rectangle.southwest(rectangle),
                          Cesium.Rectangle.northeast(rectangle),
                          Cesium.Rectangle.northwest(rectangle),
                        ];

                        samplePromises.push(Cesium.sampleTerrainMostDetailed(
                          terrainProvider,
                          cartographics
                        ))
                        taskMember.members.push({
                          "type": "open-street-map",
                          "name": task.name + " - DTM",
                          "url":`https://asdc.cloud.edu.au/api/projects/${project.id}/tasks/${task.id}/dtm/tiles?color_map=viridis&rescale=${metadata[metadataIndex].statistics[1].min},${metadata[metadataIndex].statistics[1].max}&hillshade=6`,
                          "maximumLevel": metadata[metadataIndex].maxzoom,
                          "rectangle":{
                            west:metadata[metadataIndex].bounds.value[0],
                            south:metadata[metadataIndex].bounds.value[1],
                            east:metadata[metadataIndex].bounds.value[2],
                            north:metadata[metadataIndex].bounds.value[3]
                          },
                          "idealZoom":{
                            "lookAt":{
                              "targetLongitude" :metadata[metadataIndex].center[0],
                              "targetLatitude" :metadata[metadataIndex].center[1],
                            }
                          }
                        })
                      }
                      metadataIndex++;
                    }
                    webODMgroup.members[projectIndex].members.push(taskMember);
                  })
                })
              }

              Promise.all(samplePromises).then((heights)=>{
                var heightIndex = 0;
                if (Array.isArray(odmProjects)) {
                  odmProjects.map((project, projectIndex) => {
                    taskInfos[projectIndex].map((task, taskIndex) => {
                      var memberIndex = task.available_assets.includes("georeferenced_model.laz") ? 1 : 0;

                      if (task.available_assets.includes("orthophoto.tif")) {
                        var cartesians =
                          Cesium.Ellipsoid.WGS84.cartographicArrayToCartesianArray(
                            heights[heightIndex]
                          );
                        var boundingSphere = Cesium.BoundingSphere.fromPoints(cartesians);
                        webODMgroup.members[projectIndex].members[taskIndex].members[memberIndex].idealZoom.lookAt.targetHeight = Cesium.Cartographic.fromCartesian(boundingSphere.center).height;
                        webODMgroup.members[projectIndex].members[taskIndex].members[memberIndex].idealZoom.lookAt.range = boundingSphere.radius;
                        memberIndex++;
                        heightIndex++;
                      }
                      if (task.available_assets.includes("dsm.tif")) {
                        var cartesians =
                        Cesium.Ellipsoid.WGS84.cartographicArrayToCartesianArray(
                          heights[heightIndex]
                        );
                        var boundingSphere = Cesium.BoundingSphere.fromPoints(cartesians);
                        webODMgroup.members[projectIndex].members[taskIndex].members[memberIndex].idealZoom.lookAt.targetHeight = Cesium.Cartographic.fromCartesian(boundingSphere.center).height;
                        webODMgroup.members[projectIndex].members[taskIndex].members[memberIndex].idealZoom.lookAt.range = boundingSphere.radius;
                          
                        memberIndex++;
                        heightIndex++;
                      }
                      if (task.available_assets.includes("dtm.tif")) {
                        var cartesians =
                        Cesium.Ellipsoid.WGS84.cartographicArrayToCartesianArray(
                          heights[heightIndex]
                        );
                        var boundingSphere = Cesium.BoundingSphere.fromPoints(cartesians);
                        webODMgroup.members[projectIndex].members[taskIndex].members[memberIndex].idealZoom.lookAt.targetHeight = Cesium.Cartographic.fromCartesian(boundingSphere.center).height;
                        webODMgroup.members[projectIndex].members[taskIndex].members[memberIndex].idealZoom.lookAt.range = boundingSphere.radius;
                        memberIndex++;
                        heightIndex++;
                      }
                    })
                  })
                }

                catalogJson.catalog.splice(catalogJson.catalog.length-1, 0 , webODMgroup);
                res.header("Access-Control-Allow-Origin", req.headers.origin);
                res.header("Access-Control-Allow-Credentials", true);
                res.status(200).json(catalogJson);
              })
            })
          })
        }
      })
    })
  })


  const server = app.listen(
    argv.port,
    // argv.public ? undefined : "localhost",
    argv.public ? undefined : "0.0.0.0",
    function () {
      if (argv.public) {
        console.log(
          "Cesium development server running publicly.  Connect to http://localhost:%d/",
          server.address().port
        );
      } else {
        console.log(
          "Cesium development server running locally.  Connect to http://localhost:%d/",
          server.address().port
        );
      }
    }
  );

  server.on("error", function (e) {
    if (e.code === "EADDRINUSE") {
      console.log(
        "Error: Port %d is already in use, select a different port.",
        argv.port
      );
      console.log("Example: node server.cjs --port %d", argv.port + 1);
    } else if (e.code === "EACCES") {
      console.log(
        "Error: This process does not have permission to listen on port %d.",
        argv.port
      );
      if (argv.port < 1024) {
        console.log("Try a port number higher than 1024.");
      }
    }
    console.log(e);
    process.exit(1);
  });

  server.on("close", function () {
    console.log("Cesium development server stopped.");
  });

  let isFirstSig = true;
  process.on("SIGINT", function () {
    if (isFirstSig) {
      console.log("Cesium development server shutting down.");
      server.close(function () {
        process.exit(0);
      });
      isFirstSig = false;
    } else {
      console.log("Cesium development server force kill.");
      process.exit(1);
    }
  });
})();
