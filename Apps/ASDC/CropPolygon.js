// This is currently Unused
import { viewer, tilesets } from "./State.js";

export class cropPolygon {
  constructor(data) {
    this.positions = [];

    this.data = data;

    this.polygon = viewer.entities.add({
      polygon: {
        hierarchy: new Cesium.CallbackProperty(() => {
          if (this.positions[0]) {
            var height = Cesium.Cartographic.fromCartesian(
              this.positions[0]
            ).height;

            var coords = this.positions.map((p) => {
              var cp = Cesium.Cartesian3.clone(p, new Cesium.Cartesian3());
              var carto = Cesium.Cartographic.fromCartesian(cp);
              carto.height = height;

              return Cesium.Cartographic.toCartesian(carto);
            });
            return new Cesium.PolygonHierarchy([...coords, coords[0]]);
          } else {
            return new Cesium.PolygonHierarchy([]);
          }
        }, false),
        material: Cesium.Color.WHITE.withAlpha(0.1),
        closeTop: true,
        closeBottom: true,
      },
      polyline: {
        positions: new Cesium.CallbackProperty(() => {
          if (this.positions[0]) {
            var height = Cesium.Cartographic.fromCartesian(
              this.positions[0]
            ).height;
            var coords = this.positions.map((p) => {
              var cp = Cesium.Cartesian3.clone(p, new Cesium.Cartesian3());
              var carto = Cesium.Cartographic.fromCartesian(cp);
              carto.height = height;

              return Cesium.Cartographic.toCartesian(carto);
            });

            return [...coords, coords[0]];
          } else {
            return [];
          }
        }, false),
      },
    });
    this.drawing = false;
    this.drawingHeight = false;
    this.tileset = tilesets[data.asset.id][data.id];
    this.inverseClippingPlanesOriginMatrix = Cesium.Matrix4.inverse(
      this.tileset.clippingPlanesOriginMatrix,
      new Cesium.Matrix4()
    );

    this.eventHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    this.eventHandler.setInputAction(
      this.handleLeftClick,
      Cesium.ScreenSpaceEventType.LEFT_CLICK
    );
    this.eventHandler.setInputAction(
      this.handleRightClick,
      Cesium.ScreenSpaceEventType.RIGHT_CLICK
    );
    this.eventHandler.setInputAction(
      this.handleMouseMove,
      Cesium.ScreenSpaceEventType.MOUSE_MOVE
    );
  }

  handleLeftClick = (event) => {
    const pickRay = viewer.scene.camera.getPickRay(event.position);

    if (this.drawingHeight) {
      var minDot = 0;
      var minDotIndex;

      this.normals.map((n, i) => {
        var dot = Cesium.Cartesian3.dot(n, viewer.scene.camera.direction);
        if (dot < minDot) {
          minDot = dot;
          minDotIndex = i;
        }
      });

      var intersection = Cesium.IntersectionTests.rayPlane(
        pickRay,
        this.planes[minDotIndex]
      );
      if (intersection) {
        this.drawingHeight = false;
        this.eventHandler.removeInputAction(
          Cesium.ScreenSpaceEventType.LEFT_CLICK
        );
        this.eventHandler.removeInputAction(
          Cesium.ScreenSpaceEventType.MOUSE_MOVE
        );

        this.polygon.polygon.extrudedHeight =
          Cesium.Cartographic.fromCartesian(intersection).height;

        var height = Cesium.Cartographic.fromCartesian(intersection).height;

        var coords = this.positions.map((p) => {
          var cp = Cesium.Cartesian3.clone(p, new Cesium.Cartesian3());
          var carto = Cesium.Cartographic.fromCartesian(cp);
          carto.height = height;

          return Cesium.Cartographic.toCartesian(carto);
        });

        var c = coords[0];
        this.lcs.push(c);

        var clipDirection =
          document.getElementById(`crop-direction-${this.data.id}`).value ===
          "inside"
            ? -1
            : 1;

        var topN = Cesium.Cartesian3.normalize(
          Cesium.Matrix4.multiplyByPoint(
            this.tileset.clippingPlanesOriginMatrix,
            new Cesium.Cartesian3(0, 0, 1),
            new Cesium.Cartesian3()
          ),
          new Cesium.Cartesian3()
        );

        var bottomN = Cesium.Cartesian3.normalize(
          Cesium.Matrix4.multiplyByPoint(
            this.tileset.clippingPlanesOriginMatrix,
            new Cesium.Cartesian3(0, 0, -1),
            new Cesium.Cartesian3()
          ),
          new Cesium.Cartesian3()
        );

        if (clipDirection == 1) {
          topN = Cesium.Cartesian3.negate(topN, new Cesium.Cartesian3());
        }

        if (clipDirection == -1) {
          bottomN = Cesium.Cartesian3.negate(bottomN, new Cesium.Cartesian3());
        }

        this.normals.push(topN);

        var plane = new Cesium.Plane.fromPointNormal(c, topN);
        var cplane = new Cesium.ClippingPlane(plane.normal, plane.distance);
        this.cplanes.push(cplane);

        this.lcs.push(this.lcs[0]);

        this.normals.push(bottomN);

        var plane2 = new Cesium.Plane.fromPointNormal(this.lcs[0], bottomN);
        var cplane2 = new Cesium.ClippingPlane(plane2.normal, plane2.distance);
        this.cplanes.push(cplane2);

        const clippingPlaneCollection = new Cesium.ClippingPlaneCollection({
          planes: this.cplanes,
          unionClippingRegions: clipDirection == 1 ? true : false,
          enabled: true,
        });

        clippingPlaneCollection.modelMatrix =
          this.inverseClippingPlanesOriginMatrix;

        this.tileset.clippingPlanes = clippingPlaneCollection;
      }
    } else {
      const globePosition = viewer.scene.globe.pick(pickRay, viewer.scene);
      const cartoGlobePosition =
        Cesium.Cartographic.fromCartesian(globePosition);
      if (this.positions.length == 0) {
        this.polygon.polygon.height = cartoGlobePosition.height;
      }
      if (this.positions.length > 1) this.positions.pop();

      this.positions.push(globePosition);
      this.positions.push(globePosition);

      this.drawing = true;
    }
  };

  handleMouseMove = (event) => {
    const pickRay = viewer.scene.camera.getPickRay(event.endPosition);
    if (this.drawing) {
      const globePosition = viewer.scene.globe.pick(pickRay, viewer.scene);
      if (globePosition) {
        this.positions.pop();
        this.positions.push(globePosition);
      }
    }

    if (this.drawingHeight) {
      var minDot = 0;
      var minDotIndex;

      this.normals.map((n, i) => {
        var dot = Cesium.Cartesian3.dot(n, viewer.scene.camera.direction);
        if (dot < minDot) {
          minDot = dot;
          minDotIndex = i;
        }
      });

      var intersection = Cesium.IntersectionTests.rayPlane(
        pickRay,
        this.planes[minDotIndex]
      );
      if (intersection) {
        this.polygon.polygon.extrudedHeight =
          Cesium.Cartographic.fromCartesian(intersection).height;
      }
    }
  };

  setClippingPlanesWithoutHeight = (clipDirection) => {
    var height = Cesium.Cartographic.fromCartesian(this.positions[0]).height;

    var coords = this.positions.map((p) => {
      var cp = Cesium.Cartesian3.clone(p, new Cesium.Cartesian3());
      var carto = Cesium.Cartographic.fromCartesian(cp);
      carto.height = height;

      return Cesium.Cartographic.toCartesian(carto);
    });

    //vertex normals
    var vns = coords.map((p1, i) => {
      if (i == 0) {
        var p2 = coords[i + 1];
        var p3 = coords[coords.length - 1];
      } else if (i == coords.length - 1) {
        var p2 = coords[0];
        var p3 = coords[i - 1];
      } else {
        var p2 = coords[i + 1];
        var p3 = coords[i - 1];
      }

      var l1 = Cesium.Cartesian3.normalize(
        Cesium.Cartesian3.subtract(p2, p1, new Cesium.Cartesian3()),
        new Cesium.Cartesian3()
      );
      var l2 = Cesium.Cartesian3.normalize(
        Cesium.Cartesian3.subtract(p3, p1, new Cesium.Cartesian3()),
        new Cesium.Cartesian3()
      );

      return Cesium.Cartesian3.cross(l1, l2, new Cesium.Cartesian3());
    });

    this.vns = vns;

    // Newell's method for concave polygons
    // (causes inverted normals for cw case!)
    // var normals = coords.map((c,i)=>{
    //     if (i==coords.length-1){
    //         var secondIndex=0;
    //         // var edgePlanePoints = [c,coords[0]]
    //         // var edgePlanePoints = [c,coords[secondIndex]]
    //     } else {
    //         var secondIndex=i+1;
    //         // var edgePlanePoints = [c,coords[i+1]]
    //     }
    //     var edgePlanePoints = [c,coords[secondIndex]]

    //     var epsilon = 1;

    //     var topPoint1 = Cesium.Cartesian3.clone(coords[secondIndex],new Cesium.Cartesian3());
    //     console.log(topPoint1);
    //     var cartoTopPoint1 = Cesium.Cartographic.fromCartesian(topPoint1);
    //     console.log(cartoTopPoint1);
    //     cartoTopPoint1.height = cartoTopPoint1.height + epsilon;
    //     console.log(cartoTopPoint1);
    //     edgePlanePoints.push(Cesium.Cartographic.toCartesian(cartoTopPoint1));

    //     var topPoint2 = Cesium.Cartesian3.clone(c,new Cesium.Cartesian3());
    //     var cartoTopPoint2 = Cesium.Cartographic.fromCartesian(topPoint2);
    //     cartoTopPoint2.height = cartoTopPoint2.height + epsilon;
    //     edgePlanePoints.push(Cesium.Cartographic.toCartesian(cartoTopPoint2));

    //     edgePlanePoints.push(edgePlanePoints[0]);

    //     var edgePlaneNormal = new Cesium.Cartesian3();

    //     console.log(edgePlanePoints);
    //     edgePlanePoints.map((e,j)=>{
    //         if (j==edgePlanePoints.length-1) return;
    //         var cross =
    //         // Cesium.Cartesian3.normalize(
    //                 Cesium.Cartesian3.cross(e, edgePlanePoints[j+1],new Cesium.Cartesian3())
    //                 // ,
    //             //     new Cesium.Cartesian3()
    //             // );

    //         Cesium.Cartesian3.add(edgePlaneNormal, cross, edgePlaneNormal)
    //     })
    //     console.log(edgePlaneNormal)
    //     // return edgePlaneNormal;
    //     // return Cesium.Cartesian3.normalize(edgePlaneNormal,new Cesium.Cartesian3());
    //     return Cesium.Cartesian3.normalize(
    //         Cesium.Cartesian3.negate(edgePlaneNormal,new Cesium.Cartesian3()),new Cesium.Cartesian3()
    //         );
    // })
    // console.log(normals);

    var normals = coords.map((p1, i) => {
      if (i == coords.length - 1) {
        var p2 = coords[0];
      } else {
        var p2 = coords[i + 1];
      }

      var l1 = Cesium.Cartesian3.normalize(
        Cesium.Cartesian3.subtract(p2, p1, new Cesium.Cartesian3()),
        new Cesium.Cartesian3()
      );

      if (clipDirection == 1) {
        return Cesium.Cartesian3.negate(
          Cesium.Cartesian3.normalize(
            Cesium.Cartesian3.cross(l1, vns[i], new Cesium.Cartesian3()),
            new Cesium.Cartesian3()
          ),
          new Cesium.Cartesian3()
        );
      } else {
        return Cesium.Cartesian3.normalize(
          Cesium.Cartesian3.cross(l1, vns[i], new Cesium.Cartesian3()),
          new Cesium.Cartesian3()
        );
      }
    });

    this.normals = normals;

    //line centres
    var lcs = coords.map((p1, i) => {
      if (i == coords.length - 1) {
        var p2 = coords[0];
      } else {
        var p2 = coords[i + 1];
      }
      var lc = Cesium.Cartesian3.midpoint(p1, p2, new Cesium.Cartesian3());

      return lc;
    });

    this.lcs = lcs;

    this.planes = this.normals.map((n, i) => {
      return new Cesium.Plane.fromPointNormal(lcs[i], n);
    });

    this.cplanes = this.planes.map((plane) => {
      return new Cesium.ClippingPlane(plane.normal, plane.distance);
    });
  };

  setClippingPlanesDirection = (clipDirection) => {
    this.normals = this.normals.map((n) => {
      return Cesium.Cartesian3.negate(n, new Cesium.Cartesian3());
    });

    var planes = this.normals.map((n, i) => {
      return new Cesium.Plane.fromPointNormal(this.lcs[i], n);
    });

    this.planes = planes;

    this.cplanes = planes.map((plane) => {
      return new Cesium.ClippingPlane(plane.normal, plane.distance);
    });

    const clippingPlaneCollection = new Cesium.ClippingPlaneCollection({
      planes: this.cplanes,
      unionClippingRegions: clipDirection == 1 ? true : false,
      enabled: true,
    });

    clippingPlaneCollection.modelMatrix =
      this.inverseClippingPlanesOriginMatrix;

    this.tileset.clippingPlanes = clippingPlaneCollection;
  };

  handleRightClick = () => {
    this.drawing = false;
    this.positions.pop();

    var clipDirection =
      document.getElementById(`crop-direction-${this.data.id}`).value ===
      "inside"
        ? -1
        : 1;

    this.setClippingPlanesWithoutHeight(clipDirection);

    this.eventHandler.removeInputAction(
      Cesium.ScreenSpaceEventType.RIGHT_CLICK
    );
    // this.eventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
    // this.eventHandler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    this.drawingHeight = true;
  };

  destroy = () => {
    this.eventHandler.removeInputAction(
      Cesium.ScreenSpaceEventType.RIGHT_CLICK
    );
    this.eventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
    this.eventHandler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    viewer.entities.remove(this.polygon);

    this.tileset.clippingPlanes.enabled = false;
  };
}
