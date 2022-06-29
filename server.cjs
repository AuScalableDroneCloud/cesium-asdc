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
  Cesium.Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI1NWZkNGFlZS1iNzVhLTRmNTAtOThmYi1kMTI1MjlmOTVlNjciLCJpZCI6NzIyNTQsImlhdCI6MTYzNTkwNDI4OX0.EXVvJZa8yaugMmQNkc9pjWfrjqeOpZ8Jg7_0Hdwnb1A";
  const https = require('https');

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
    // res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Origin", req.headers.origin);
    res.header("Access-Control-Allow-Credentials", true);
    res.header(
      "Access-Control-Allow-Headers",
      // "Origin, X-Requested-With, Content-Type, Accept"
      "Origin, X-Requested-With, Content-Type, Accept, Cache-control"
    );
    res.header("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE");
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
    // /^(?:Host|Proxy-Connection|Connection|Keep-Alive|Transfer-Encoding|TE|Trailer|Proxy-Authorization|Proxy-Authenticate|Upgrade|Origin|Referer)$/i;

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

  //unused
  app.get("/cesium/terriaCatalog.json", (req, res) => {
    var baseURL;
    if (req.headers.origin && !req.headers.origin.startsWith("http://localhost") && !req.headers.origin.startsWith("https://localhost")){
      baseURL = req.headers.origin;
    } else if (req.headers.host && !req.headers.host.startsWith("localhost") && !req.headers.host.startsWith("localhost")) {
      if (req.headers.referer){
        if (req.headers.referer.startsWith("https")){
          baseURL = `https://${req.headers.host}`;
        } else {
          baseURL = `http://${req.headers.host}`;
        }
      } else {
        baseURL = `http://${req.headers.host}`;
      }
    } else {
      baseURL = "https://asdc.cloud.edu.au";
      // baseURL = "https://dev.asdc.cloud.edu.au";
      // baseURL = "http://localhost:8080";
    }
    const eptServer = `${baseURL}/ept`;
    var catalogJson = {
      "catalog": []
    }
    var webODMgroup = {
      "type": "group",
      "name": "WebODM Projects",
      "members": []
    };
    fetch(`${baseURL}/api/projects/?ordering=-created_at`, {
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
          taskInfoPromises.push(
            fetch(`${baseURL}/api/projects/${project.id}/tasks/?ordering=-created_at`, {
              headers: { Cookie: req.headers.cookie }
            }).then(response => {
              return response.json()
            })
            .catch(()=>{
              res.status(500).json("An error occurred while getting projects from webODM");
            }));
        })
        Promise.all(taskInfoPromises).then((taskInfos, taskIndex) => {
          if (Array.isArray(odmProjects)) {
            odmProjects.map((project, projectIndex) => {
              taskInfos[projectIndex].map(task => {
                var assetFiles= ["georeferenced_model.laz", "orthophoto.tif", "dsm.tif", "dtm.tif"];
                assetFiles.map(typeFile=>{
                  if (task.available_assets.includes(typeFile)) {
                    var fileURL;
                    if (typeFile==="georeferenced_model.laz"){
                      fileURL = `${baseURL}/api/projects/${project.id}/tasks/${task.id}/assets/entwine_pointcloud/ept.json`;
                    } else {
                      fileURL = `${baseURL}/api/projects/${project.id}/tasks/${task.id}/${typeFile.slice(0,-4)}/metadata`;
                    }
                    metaDataPromises.push(
                      fetch(fileURL, {
                        headers: { Cookie: req.headers.cookie }
                      }).then(response => {
                        if(response.status===200){
                          return response.json();
                        }
                      }).catch((e) => {
                        console.log("error while getting metadata");
                      })
                    )
                  }
                })
              })
            })
          }
          
          Promise.all(metaDataPromises)
          .then((metadata) => {
            var metadataIndex = 0;
            var samplePromises = [];
            var terrainProvider = Cesium.createWorldTerrain();
            if (Array.isArray(odmProjects)) {
              odmProjects.map((project, projectIndex) => {
                var projectMember = {
                  "type": "group",
                  "name": project.name,
                  "members": []
                };

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
                        "url":`${eptServer}/tileset.json?ept=${`${baseURL}/api/projects/${project.id}/tasks/${task.id}/assets/entwine_pointcloud/ept.json`}&${truncate ? "truncate" : null}`
                      })
                    }
                    metadataIndex++;
                  }

                  var imageryTypes = ["Orthophoto","DSM","DTM"];
                  imageryTypes.map(imageryType=>{
                    if (task.available_assets.includes(`${imageryType.toLowerCase()}.tif`)) {
                      if (metadata[metadataIndex]) {
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

                        var tilesUrl;
                        if (imageryType==="Orthophoto") {
                          tilesUrl = `${baseURL}/api/projects/${project.id}/tasks/${task.id}/orthophoto/tiles?rescale=${metadata[metadataIndex].statistics[1].min},${metadata[metadataIndex].statistics[1].max}`;
                        } else if (imageryType==="DSM") {
                          tilesUrl = `${baseURL}/api/projects/${project.id}/tasks/${task.id}/dsm/tiles?color_map=viridis&rescale=${metadata[metadataIndex].statistics[1].min},${metadata[metadataIndex].statistics[1].max}&hillshade=6`;
                        } else if (imageryType==="DTM") {
                          tilesUrl = `${baseURL}/api/projects/${project.id}/tasks/${task.id}/dtm/tiles?color_map=viridis&rescale=${metadata[metadataIndex].statistics[1].min},${metadata[metadataIndex].statistics[1].max}&hillshade=6`;
                        }

                        taskMember.members.push({
                          "type": "open-street-map",
                          "name": `${task.name} - ${imageryType}`,
                          "url":tilesUrl,
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
                  })

                  if (taskMember.members.length>0){
                    projectMember.members.push(taskMember);
                  }
                })

                if (projectMember.members.length>0){
                  webODMgroup.members.push(projectMember);
                }
              })
            }

            Promise.all(samplePromises)
            .then((heights)=>{
              var heightIndex = 0;
              if (Array.isArray(odmProjects)) {
                odmProjects.map((project, projectIndex) => {
                  taskInfos[projectIndex].map((task, taskIndex) => {
                    webODMgroup.members[projectIndex]?.members[taskIndex]?.members.map(member=>{
                      if (member.type!="3d-tiles"){
                        var cartesians =
                        Cesium.Ellipsoid.WGS84.cartographicArrayToCartesianArray(
                          heights[heightIndex]
                        );
                        var boundingSphere = Cesium.BoundingSphere.fromPoints(cartesians);
                        member.idealZoom.lookAt.targetHeight = Cesium.Cartographic.fromCartesian(boundingSphere.center).height;
                        member.idealZoom.lookAt.range = boundingSphere.radius;
                      
                        heightIndex++;
                      }
                    })
                  })
                })
              }

              catalogJson.catalog.push(webODMgroup);
              res.header("Access-Control-Allow-Origin", req.headers.origin);
              res.header("Access-Control-Allow-Credentials", true);
              res.status(200).json(catalogJson);
            })
            .catch((e)=>{
              console.error(e);
              res.status(500).json("An error occurred while sampling heights");
            })
          })
          .catch(e=>{
            console.error(e);
            res.status(500).json("An error occurred while getting all metadata");
          })
        })
      }
    })
    .catch(()=>{
      res.status(500).json("An error occurred while getting the projects from webodm");
    })
  })

  app.get("/cesium/terriaCatalog/projects", (req, res) => { 
    var baseURL;
    if (req.headers.origin && !req.headers.origin.startsWith("http://localhost") && !req.headers.origin.startsWith("https://localhost")){
      baseURL = req.headers.origin;
    } else if (req.headers.host && !req.headers.host.startsWith("localhost") && !req.headers.host.startsWith("localhost")) {
      if (req.headers.referer){
        if (req.headers.referer.startsWith("https")){
          baseURL = `https://${req.headers.host}`;
        } else {
          baseURL = `http://${req.headers.host}`;
        }
      } else {
        baseURL = `http://${req.headers.host}`;
      }
    } else {
      baseURL = "https://asdc.cloud.edu.au";
      // baseURL = "https://dev.asdc.cloud.edu.au";
      // baseURL = "http://localhost:8080";
    }
    
    var catalog = [];
    fetch(`${baseURL}/api/projects/?ordering=-created_at`, {
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
      if (Array.isArray(odmProjects)) {
        odmProjects.map((project, projectIndex) => {
          var projectMember = {
            "type": "terria-reference",
            "name": project.name,
            "isGroup":true,
            "url": `${baseURL}/cesium/terriaCatalog/projects/${project.id}`,
            itemProperties:{
              "permissions": project.permissions,
            }
          };
          catalog.push(projectMember);
        })
        
        res.status(200).json({catalog:catalog});
      }
    })
    .catch((e)=>{
      res.status(500).json("An error occurred while getting projects from webODM: " + e.code);
    });
  })

  app.get("/cesium/terriaCatalog/projects/:projectId", (req, res) => {
    var baseURL;
    if (req.headers.origin && !req.headers.origin.startsWith("http://localhost") && !req.headers.origin.startsWith("https://localhost")){
      baseURL = req.headers.origin;
    } else if (req.headers.host && !req.headers.host.startsWith("localhost") && !req.headers.host.startsWith("localhost")) {
      if (req.headers.referer){
        if (req.headers.referer.startsWith("https")){
          baseURL = `https://${req.headers.host}`;
        } else {
          baseURL = `http://${req.headers.host}`;
        }
      } else {
        baseURL = `http://${req.headers.host}`;
      }
    } else {
      baseURL = "https://asdc.cloud.edu.au";
      // baseURL = "https://dev.asdc.cloud.edu.au";
      // baseURL = "http://localhost:8080";
    }

    var project = req.params.projectId;

    var catalog=[];

    fetch(`${baseURL}/api/projects/${project}/tasks/?ordering=-created_at`, {
      headers: { Cookie: req.headers.cookie }
    }).then(response => {
      if (response.status === 200) {
        return response.json()
      }
    })
    .then((odmTasks)=>{
      odmTasks.map((task)=>{
        if (task.available_assets.length>0){
          var taskMember = {
            "type": "terria-reference",
            "name": task.name,
            "isGroup":true,
            "url": `${baseURL}/cesium/terriaCatalog/projects/${project}/tasks/${task.id}`
          };
          catalog.push(taskMember);
        }
      })

      res.status(200).json({catalog:catalog});
    })
    .catch(()=>{
      res.status(500).json("An error occurred while getting tasks from webODM");
    });
  })

  app.get("/cesium/terriaCatalog/projects/:projectId/tasks/:taskId", (req, res) => {
    var baseURL;
    if (req.headers.origin && !req.headers.origin.startsWith("http://localhost") && !req.headers.origin.startsWith("https://localhost")){
      baseURL = req.headers.origin;
    } else if (req.headers.host && !req.headers.host.startsWith("localhost") && !req.headers.host.startsWith("localhost")) {
      if (req.headers.referer){
        if (req.headers.referer.startsWith("https")){
          baseURL = `https://${req.headers.host}`;
        } else {
          baseURL = `http://${req.headers.host}`;
        }
      } else {
        baseURL = `http://${req.headers.host}`;
      }
    } else {
      baseURL = "https://asdc.cloud.edu.au";
      // baseURL = "https://dev.asdc.cloud.edu.au";
      // baseURL = "http://localhost:8080";
    }
    var projectId = req.params.projectId;
    var taskId = req.params.taskId;

    var catalog = [];
    var metaDataPromises=[];
    const eptServer = `${baseURL}/ept`;

    fetch(`${baseURL}/api/projects/${projectId}/tasks/${taskId}`,{
      headers: { Cookie: req.headers.cookie }
    })
    .then(response => {
      if(response.status===200){
        return response.json();
      }
    })
    .then((task)=>{
      var assetFiles= ["georeferenced_model.laz", "orthophoto.tif", "dsm.tif", "dtm.tif"];
      assetFiles.map(typeFile=>{
        if (task.available_assets.includes(typeFile)) {
          var fileURL;
          if (typeFile==="georeferenced_model.laz"){
            fileURL = `${baseURL}/api/projects/${projectId}/tasks/${taskId}/assets/entwine_pointcloud/ept.json`;
          } else {
            fileURL = `${baseURL}/api/projects/${projectId}/tasks/${taskId}/${typeFile.slice(0,-4)}/metadata`;
          }
          metaDataPromises.push(
            fetch(fileURL, {
              headers: { Cookie: req.headers.cookie }
            }).then(response => {
              if(response.status===200){
                return response.json();
              }
            }).catch((e) => {
              console.log("error while getting metadata");
            })
          )
        }
      })
  
      Promise.all(metaDataPromises)
      .then((metadata) => {
        var metadataIndex = 0;
        var samplePromises = [];
        var terrainProvider = Cesium.createWorldTerrain();
        
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
          catalog.push({
            "type": "3d-tiles",
            "name": task.name + " - Point Cloud",
            "url":`${eptServer}/tileset.json?ept=${`${baseURL}/api/projects/${projectId}/tasks/${taskId}/assets/entwine_pointcloud/ept.json`}&${truncate ? "truncate" : null}`,
            info: [
              {
                name: "webODM Properties",
                content:"",
                contentAsObject:{
                  "public": task.public,
                },
                show:false
              }
            ]
          })
        }
        metadataIndex++;
  
        var imageryTypes = ["Orthophoto","DSM","DTM"];
        imageryTypes.map(imageryType=>{
          if (metadata[metadataIndex]) {
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
  
            var tilesUrl;
            if (imageryType==="Orthophoto") {
              tilesUrl = `${baseURL}/api/projects/${projectId}/tasks/${taskId}/orthophoto/tiles?rescale=${metadata[metadataIndex].statistics[1].min},${metadata[metadataIndex].statistics[1].max}`;
            } else if (imageryType==="DSM") {
              tilesUrl = `${baseURL}/api/projects/${projectId}/tasks/${taskId}/dsm/tiles?color_map=viridis&rescale=${metadata[metadataIndex].statistics[1].min},${metadata[metadataIndex].statistics[1].max}&hillshade=6`;
            } else if (imageryType==="DTM") {
              tilesUrl = `${baseURL}/api/projects/${projectId}/tasks/${taskId}/dtm/tiles?color_map=viridis&rescale=${metadata[metadataIndex].statistics[1].min},${metadata[metadataIndex].statistics[1].max}&hillshade=6`;
            }
  
            catalog.push({
              "type": "open-street-map",
              "name": `${task.name} - ${imageryType}`,
              "url":tilesUrl,
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
              },
              info: [
                {
                  name: "webODM Properties",
                  content:"",
                  contentAsObject:{
                    "public": task.public,
                  },
                  show:false
                }
              ]
            })
          }
          metadataIndex++;
        })
  
        Promise.all(samplePromises)
        .then((heights)=>{
          var heightIndex = 0;
          catalog.map(member=>{
            if (member.type!="3d-tiles"){
              var cartesians =
              Cesium.Ellipsoid.WGS84.cartographicArrayToCartesianArray(
                heights[heightIndex]
              );
              var boundingSphere = Cesium.BoundingSphere.fromPoints(cartesians);
              member.idealZoom.lookAt.targetHeight = Cesium.Cartographic.fromCartesian(boundingSphere.center).height;
              member.idealZoom.lookAt.range = boundingSphere.radius;
            
              heightIndex++;
            }
          })
  
          res.header("Access-Control-Allow-Origin", req.headers.origin);
          res.header("Access-Control-Allow-Credentials", true);
          res.status(200).json({catalog:catalog});
        })
        .catch((e)=>{
          console.error(e);
          res.status(500).json("An error occurred while sampling heights");
        })
      })
      .catch(e=>{
        console.error(e);
        res.status(500).json("An error occurred while getting all metadata");
      })
    })
    .catch((e) => {
      console.log("error while getting metadata");
    })
  })

  app.get("/cesium/terria/publictask/:taskID.json", (req, res) => {
    var baseURL;
    if (req.headers.origin && !req.headers.origin.startsWith("http://localhost") && !req.headers.origin.startsWith("https://localhost")){
      baseURL = req.headers.origin;
    } else if (req.headers.host && !req.headers.host.startsWith("localhost") && !req.headers.host.startsWith("localhost")) {
      if (req.headers.referer){
        if (req.headers.referer.startsWith("https")){
          baseURL = `https://${req.headers.host}`;
        } else {
          baseURL = `http://${req.headers.host}`;
        }
      } else {
        baseURL = `http://${req.headers.host}`;
      }
    } else {
      baseURL = "https://asdc.cloud.edu.au";
      // baseURL = "https://dev.asdc.cloud.edu.au";
      // baseURL = "http://localhost:8080";
    }
    const eptServer = `${baseURL}/ept`;
    fetch(`${baseURL}/public/task/${req.params.taskID}/json`)
      .then(response => response.json())
      .then((publicTask) => {
        var initUrlsFile = {
          "homeCamera": {
            "north": -8,
            "east": 158,
            "south": -45,
            "west": 109
          },
          catalog: [
            {
              "type": "group",
              "name" : publicTask.name,
              members:[]
            }
          ],
          "baseMaps": {
            "defaultBaseMapId": "basemap-bing-aerial-with-labels"
          }
        }
        var projectID = publicTask.project;
        var assetFiles= ["georeferenced_model.laz", "orthophoto.tif", "dsm.tif", "dtm.tif"];
        var metaDataPromises = [];
        assetFiles.map(typeFile=>{
          if (publicTask.available_assets.includes(typeFile)) {
            var fileURL;
            if (typeFile==="georeferenced_model.laz"){
              fileURL = `${baseURL}/api/projects/${projectID}/tasks/${publicTask.id}/assets/entwine_pointcloud/ept.json`;
            } else {
              fileURL = `${baseURL}/api/projects/${projectID}/tasks/${publicTask.id}/${typeFile.slice(0,-4)}/metadata`;
            }
            metaDataPromises.push(
              fetch(fileURL, {
                headers: { Cookie: req.headers.cookie }
              }).then(response => {
                if(response.status===200){
                  return response.json();
                }
              }).catch((e) => {
                // console.log(e);
              })
            )
          }
        })
        Promise.all(metaDataPromises)
        .then((metadata) => {
          var metadataIndex=0;
          var samplePromises=[];
          var terrainProvider = Cesium.createWorldTerrain();
          if (publicTask.available_assets.includes("georeferenced_model.laz")) {
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
              initUrlsFile.catalog[0].members.push({
                "type": "3d-tiles",
                "name": publicTask.name + " - Point Cloud",
                "url":`${eptServer}/tileset.json?ept=${`${baseURL}/api/projects/${projectID}/tasks/${publicTask.id}/assets/entwine_pointcloud/ept.json`}&${truncate ? "truncate" : null}`
              })
            }
            metadataIndex++;
          }

          var imageryTypes = ["Orthophoto","DSM","DTM"];
          imageryTypes.map(imageryType=>{
            if (publicTask.available_assets.includes(`${imageryType.toLowerCase()}.tif`)) {
              if (metadata[metadataIndex]) {
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

                var tilesUrl;
                if (imageryType==="Orthophoto") {
                  tilesUrl = `${baseURL}/api/projects/${projectID}/tasks/${publicTask.id}/orthophoto/tiles?rescale=${metadata[metadataIndex].statistics[1].min},${metadata[metadataIndex].statistics[1].max}`;
                } else if (imageryType==="DSM") {
                  tilesUrl = `${baseURL}/api/projects/${projectID}/tasks/${publicTask.id}/dsm/tiles?color_map=viridis&rescale=${metadata[metadataIndex].statistics[1].min},${metadata[metadataIndex].statistics[1].max}&hillshade=6`;
                } else if (imageryType==="DTM") {
                  tilesUrl = `${baseURL}/api/projects/${projectID}/tasks/${publicTask.id}/dtm/tiles?color_map=viridis&rescale=${metadata[metadataIndex].statistics[1].min},${metadata[metadataIndex].statistics[1].max}&hillshade=6`;
                }

                initUrlsFile.catalog[0].members.push({
                  "type": "open-street-map",
                  "name": `${publicTask.name} - ${imageryType}`,
                  "url":tilesUrl,
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
          })

          Promise.all(samplePromises)
            .then((heights)=>{
              var heightIndex = 0;

              initUrlsFile.catalog[0].members.map(member=>{
                if (member.type!="3d-tiles"){
                  var cartesians =
                  Cesium.Ellipsoid.WGS84.cartographicArrayToCartesianArray(
                    heights[heightIndex]
                  );
                  var boundingSphere = Cesium.BoundingSphere.fromPoints(cartesians);
                  member.idealZoom.lookAt.targetHeight = Cesium.Cartographic.fromCartesian(boundingSphere.center).height;
                  member.idealZoom.lookAt.range = boundingSphere.radius;
                
                  heightIndex++;
                }
              })

              // catalogJson.catalog.splice(catalogJson.catalog.length-1, 0 , webODMgroup);
              res.header("Access-Control-Allow-Origin", req.headers.origin);
              res.header("Access-Control-Allow-Credentials", true);
              res.status(200).json(initUrlsFile);
            })
            .catch((e)=>{
              console.error(e);
              res.status(500).json("An error occurred while getting the catalog file");
            })
        })
        .catch((e)=>{
          console.error(e);
          res.status(500).json("An error occurred while getting the catalog file");
        })
      })
      .catch((e)=>{
        console.error(e);
        res.status(500).json("An error occurred while getting the catalog file");
      })
  })

  app.patch("/cesium/makeWebODMTaskPublic/:project/:taskID", (req, res) => {
    var baseURL;
    if (req.headers.origin && !req.headers.origin.startsWith("http://localhost") && !req.headers.origin.startsWith("https://localhost")){
      baseURL = req.headers.origin;
    } else if (req.headers.host && !req.headers.host.startsWith("localhost") && !req.headers.host.startsWith("localhost")) {
      if (req.headers.referer){
        if (req.headers.referer.startsWith("https")){
          baseURL = `https://${req.headers.host}`;
        } else {
          baseURL = `http://${req.headers.host}`;
        }
      } else {
        baseURL = `http://${req.headers.host}`;
      }
    } else {
      baseURL = "https://asdc.cloud.edu.au";
      // baseURL = "https://dev.asdc.cloud.edu.au";
      // baseURL = "http://localhost:8080";
    }
    var project = req.params.project;
    var task = req.params.taskID;
    if (req.headers.cookie) {
      var cookies = req.headers.cookie.split(';')
        .map(v => v.split('='))
        .reduce((acc, v) => {
          if (v[0] && v[1]) {
            acc[decodeURIComponent(v[0].trim())] = decodeURIComponent(v[1].trim());
          }
          return acc;
        }, {})
      fetch(`${baseURL}/api/projects/${project}/tasks/${task}/`, {
        headers: { 
          "content-type": "application/json",
          Cookie: req.headers.cookie,
          "Referer": `${baseURL}/`,
          "x-csrftoken": cookies["csrftoken"],
        },
        "body": "{\"public\":true}",
        "method": "PATCH"
      })
      .then(response => {
        if(response.status===200){
          return response.json();
        } else {
          res.status(response.status).send(response.statusText);
        }
      }).then((json)=>{
        res.status(200).send(json);
      }).catch((e)=>{
        res.status(500).send("Error");
      })
    } else {
      res.status(401).send("Unauthorized");
    }
  })

  app.get("/cesium/publicCatalogs.json", (req, res) => {
    var urls = [
      "https://terria-catalogs-public.storage.googleapis.com/nationalmap/prod.json",
      "https://raw.githubusercontent.com/GeoscienceAustralia/dea-config/master/dev/terria/dea-maps-v8.json",
      "https://terria-catalogs-public.storage.googleapis.com/de-australia/water-regulations-data/prod.json",
      "https://nsw.digitaltwin.terria.io/api/v0/registry/records/map-config?aspect=terria-config&aspect=terria-init&aspect=group&optionalAspect=terria&dereference=true"
    ];
    var promises = [];

    urls.map(url=>{
      promises.push(
        fetch(url)
        .then(response => response.json())
        )
    })

    var catalogJson = {
      "catalog": []
    }
    
    Promise.all(promises)
    .then((responses)=>{
      catalogJson.catalog.push({
        type:"group",
        name: "NationalMap Catalog",
        members:responses[0].catalog,
      })

      catalogJson.catalog.push({
        type:"group",
        name: "Digital Earth Catalog",
        members:responses[1].catalog,
      })
      catalogJson.catalog.push({
        type:"group",
        name: "Digital Earth Catalog",
        members:responses[2].catalog,
      })

      var nswMembers = responses[3].aspects.group.members;
      var nswPromises = [];

      const checkProxyUrlAndType = (json)=>{
        return new Promise((resolve, reject) => {
          if(json.aspects && json.aspects.terria){
            if (json.aspects.terria.definition) {
              if (json.aspects.terria.definition.url){
                if (json.aspects.terria.definition.url.startsWith("https://api.transport.nsw.gov.au")){
                  json.aspects.terria.definition.url = json.aspects.terria.definition.url.replace("https://api.transport.nsw.gov.au","https://nsw.digitaltwin.terria.io/proxy/https://api.transport.nsw.gov.au")
                }

                if (json.aspects.terria.definition.url.startsWith("https://nsw-digital-twin-data.terria.io/geoserver/ows")){
                  json.aspects.terria.definition.url = json.aspects.terria.definition.url.replace("https://nsw-digital-twin-data.terria.io/geoserver/ows","https://nsw.digitaltwin.terria.io/proxy/https://nsw-digital-twin-data.terria.io/geoserver/ows");
                }

                if (json.aspects.terria.definition.url.startsWith("/")){
                  json.aspects.terria.definition.url = "https://nsw.digitaltwin.terria.io" + json.aspects.terria.definition.url;
                }
              }
            }
            if (json.aspects.terria.type){
              var filterTypes = ['nsw-fuel-price','air-quality-json','nsw-rfs','nsw-traffic'];
              if (filterTypes.includes(json.aspects.terria.type)){
                Object.keys(json).map(k=>delete(json[k]))
                resolve();
              }
            }
          }
          if (json.aspects && json.aspects.group && json.aspects.group.members && json.aspects.group.members.length>0) {
            if (json.aspects.group.members.every(jm=>typeof jm=="string")){
              fetch(`https://nsw.digitaltwin.terria.io/api/v0/registry/records/${json.id}?optionalAspect=terria&optionalAspect=group&optionalAspect=dcat-dataset-strings&optionalAspect=dcat-distribution-strings&optionalAspect=dataset-distributions&optionalAspect=dataset-format&dereference=true`)
              .then(response => response.json())
              .then(expandedJson=>{
                json.aspects.group.members = expandedJson.aspects.group.members;
                
                var promises=[];
                for(var i=0;i<json.aspects.group.members.length;i++){
                  promises.push(checkProxyUrlAndType(json.aspects.group.members[i]));
                }
                Promise.all(promises)
                  .then(()=>{
                    resolve();
                  })
              })
            } else {
              var promises=[];
              for(var i=0;i<json.aspects.group.members.length;i++){
                promises.push(checkProxyUrlAndType(json.aspects.group.members[i]))
              }

              Promise.all(promises)
                .then(()=>{
                  resolve();
                })
            }
          } else {
            resolve();
          }
        })
      }

      nswMembers.map(m=>{
        delete(m.aspects);
        delete(m.authnReadPolicyId);
        m.url="https://nsw.digitaltwin.terria.io";
        m.type="magda";
        m.recordId=m.id;
        nswPromises.push(
          new Promise((resolve, reject) => {
            fetch(`https://nsw.digitaltwin.terria.io/api/v0/registry/records/${m.id}?optionalAspect=terria&optionalAspect=group&optionalAspect=dcat-dataset-strings&optionalAspect=dcat-distribution-strings&optionalAspect=dataset-distributions&optionalAspect=dataset-format&dereference=true`)
            .then(response => response.json())
            .then(json=>{
              checkProxyUrlAndType(json).then(()=>{
                m.magdaRecord=json;
                if ((json.aspects && json.aspects.group && json.aspects.group.members && Array.isArray(json.aspects.group.members)) ||
                  (json.aspects && json.aspects.terria && json.aspects.terria.definition && json.aspects.terria.definition.isGroup)
                ){
                  m.isGroup=true;
                }

                resolve();
              })
            })
          })
        )
      })

      Promise.all(nswPromises).then(()=>{
          catalogJson.catalog.push({
            type:"group",
            name: "NSW Spatial Digital Twin Catalog",
            members:nswMembers
          })
          res.status(200).json(catalogJson);
      })
    })
  })

//   const key = fs.readFileSync('./key.pem');
//   const cert = fs.readFileSync('./certificate.pem');
//   const server = https.createServer({
//     key: key,
//     cert: cert
// }, app);
  const server = app.listen(
  // server.listen(
    argv.port,
    // 443,
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
    console.log("server error");
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
