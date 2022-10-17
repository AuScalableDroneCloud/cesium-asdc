import { cropBox } from "./CropBox.js";
import { viewer, tilesets, cropBoxes, cropRectangles } from "./State.js";

export class cropRectangle {
  constructor(data) {
    this.positions = [];

    this.data = data;

    this.polygon = viewer.entities.add({
      polygon: {
        hierarchy: new Cesium.CallbackProperty(() => {
          if (this.positions[0] && this.positions[1]) {
            var xaxis = Cesium.Matrix4.multiplyByPointAsVector(
              this.tileset.clippingPlanesOriginMatrix,
              new Cesium.Cartesian3(1, 0, 0),
              new Cesium.Cartesian3()
            );

            var yaxis = Cesium.Matrix4.multiplyByPointAsVector(
              this.tileset.clippingPlanesOriginMatrix,
              new Cesium.Cartesian3(0, 1, 0),
              new Cesium.Cartesian3()
            );

            var dot = Cesium.Cartesian3.dot(
              Cesium.Cartographic.toCartesian(this.positions[1]),
              xaxis,
              new Cesium.Cartesian3()
            );

            var dot2 = Cesium.Cartesian3.dot(
              Cesium.Cartographic.toCartesian(this.positions[0]),
              xaxis,
              new Cesium.Cartesian3()
            );

            this.lenX = dot - dot2;

            var l1 = Cesium.Cartesian3.multiplyByScalar(
              xaxis,
              this.lenX,
              new Cesium.Cartesian3()
            );

            Cesium.Cartesian3.add(
              Cesium.Cartographic.toCartesian(this.positions[0]),
              l1,
              l1
            );

            l1 = Cesium.Cartographic.fromCartesian(l1);

            var dot3 = Cesium.Cartesian3.dot(
              Cesium.Cartographic.toCartesian(this.positions[1]),
              yaxis,
              new Cesium.Cartesian3()
            );

            var dot4 = Cesium.Cartesian3.dot(
              Cesium.Cartographic.toCartesian(this.positions[0]),
              yaxis,
              new Cesium.Cartesian3()
            );

            this.lenY = dot3 - dot4;

            var l2 = Cesium.Cartesian3.multiplyByScalar(
              yaxis,
              this.lenY,
              new Cesium.Cartesian3()
            );

            Cesium.Cartesian3.add(
              Cesium.Cartographic.toCartesian(this.positions[0]),
              l2,
              l2
            );

            l2 = Cesium.Cartographic.fromCartesian(l2);

            return new Cesium.PolygonHierarchy(
              Cesium.Ellipsoid.WGS84.cartographicArrayToCartesianArray([
                this.positions[0],
                l1,
                this.positions[1],
                l2,
                this.positions[0],
              ])
            );
          } else {
            return new Cesium.PolygonHierarchy([]);
          }
        }, false),
        material: Cesium.Color.WHITE.withAlpha(0.1),
        closeTop: true,
        closeBottom: true,
        outlineColor: Cesium.Color.WHITE,
        outline: true,
        outlineWidth: 2,
      },
    });
    this.drawing = false;
    this.drawingHeight = false;
    this.eventHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    this.eventHandler.setInputAction(
      this.handleClick,
      Cesium.ScreenSpaceEventType.LEFT_CLICK
    );
    this.eventHandler.setInputAction(
      this.handleMouseMove,
      Cesium.ScreenSpaceEventType.MOUSE_MOVE
    );

    this.tileset = tilesets[data.asset.id][data.id];
    this.inverseClippingPlanesOriginMatrix = Cesium.Matrix4.inverse(
      this.tileset.clippingPlanesOriginMatrix,
      new Cesium.Matrix4()
    );

    viewer.scene.canvas.style.cursor = "auto";
  }

  removeEventHandlers = () => {
    this.eventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
    this.eventHandler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
  };

  handleClick = (event) => {
    if (this.drawingHeight) {
      this.drawingHeight = false;
      this.eventHandler.removeInputAction(
        Cesium.ScreenSpaceEventType.LEFT_CLICK
      );
      this.eventHandler.removeInputAction(
        Cesium.ScreenSpaceEventType.MOUSE_MOVE
      );

      var clipDirection =
        document.getElementById(`crop-direction-${this.data.id}`).value ===
        "inside"
          ? -1
          : 1;

      this.setClippingPlanesDirection(clipDirection);
    }
    if (this.positions.length < 2 || this.drawing) {
      const pickRay = viewer.scene.camera.getPickRay(event.position);
      const globePosition = viewer.scene.globe.pick(pickRay, viewer.scene);
      const cartoGlobePosition =
        Cesium.Cartographic.fromCartesian(globePosition);
      if (this.positions.length == 0) {
        this.drawing = true;
        this.polygon.polygon.height = cartoGlobePosition.height;
      }
      if (this.positions.length > 0) this.positions.pop();
      this.positions.push(Cesium.Cartographic.fromCartesian(globePosition));
      if (this.positions.length == 2) {
        this.drawing = false;
        this.drawingHeight = true;
      }
    }
  };

  handleMouseMove = (event) => {
    const pickRay = viewer.scene.camera.getPickRay(event.endPosition);
    if (this.drawing) {
      const globePosition = viewer.scene.globe.pick(pickRay, viewer.scene);
      if (this.positions.length == 2) this.positions.pop();
      this.positions.push(Cesium.Cartographic.fromCartesian(globePosition));
    }

    if (this.drawingHeight) {
      this.calcProperties();

      var minDot = 0;
      var minDotIndex;

      this.normals.slice(0, 4).map((n, i) => {
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

        this.cPlanes = this.planes.map((plane, i) => {
          return new Cesium.ClippingPlane(plane.normal, plane.distance);
        });
      }
    }
  };

  calcProperties = () => {
    var baseHeight = this.positions[0].height;
    if (this.positions[0].longitude < this.positions[1].longitude) {
      var west = this.positions[0].longitude;
      var east = this.positions[1].longitude;
    } else {
      var west = this.positions[1].longitude;
      var east = this.positions[0].longitude;
    }

    if (this.positions[0].latitude < this.positions[1].latitude) {
      var south = this.positions[0].latitude;
      var north = this.positions[1].latitude;
    } else {
      var south = this.positions[1].latitude;
      var north = this.positions[0].latitude;
    }

    var p1 = Cesium.Cartographic.toCartesian(
      new Cesium.Cartographic(west, north, baseHeight)
    );
    var p2 = Cesium.Cartographic.toCartesian(
      new Cesium.Cartographic(west, south, baseHeight)
    );
    var p3 = Cesium.Cartographic.toCartesian(
      new Cesium.Cartographic(east, north, baseHeight)
    );
    var p4 = Cesium.Cartographic.toCartesian(
      new Cesium.Cartographic(east, south, baseHeight)
    );

    this.points = [p1, p2, p3, p4];

    var n1 = Cesium.Cartesian3.normalize(
      Cesium.Cartesian3.subtract(p2, p1, new Cesium.Cartesian3()),
      new Cesium.Cartesian3()
    ); //south
    var n2 = Cesium.Cartesian3.normalize(
      Cesium.Cartesian3.subtract(p1, p2, new Cesium.Cartesian3()),
      new Cesium.Cartesian3()
    ); //north-pointing
    var n3 = Cesium.Cartesian3.normalize(
      Cesium.Cartesian3.subtract(p1, p3, new Cesium.Cartesian3()),
      new Cesium.Cartesian3()
    ); //west
    var n4 = Cesium.Cartesian3.normalize(
      Cesium.Cartesian3.subtract(p3, p1, new Cesium.Cartesian3()),
      new Cesium.Cartesian3()
    ); //east

    this.normals = [n1, n2, n3, n4];

    var clipDirection =
      document.getElementById(`crop-direction-${this.data.id}`).value ===
      "inside"
        ? -1
        : 1;

    if (clipDirection == -1) {
      var normals = this.normals.map((n) => {
        return Cesium.Cartesian3.negate(n, new Cesium.Cartesian3());
      });
    } else {
      var normals = this.normals;
    }

    var plane1 = new Cesium.Plane.fromPointNormal(p1, normals[0]);
    var plane2 = new Cesium.Plane.fromPointNormal(p2, normals[1]);
    var plane3 = new Cesium.Plane.fromPointNormal(p3, normals[2]);
    var plane4 = new Cesium.Plane.fromPointNormal(p1, normals[3]);

    this.planes = [plane1, plane2, plane3, plane4];
  };

  setClippingPlanesDirection = (clipDirection) => {
    var p5 = Cesium.Cartographic.fromCartesian(
      Cesium.Cartesian3.clone(this.points[0], new Cesium.Cartesian3())
    );
    p5.height = this.polygon.polygon.extrudedHeight.getValue();
    p5 = Cesium.Cartographic.toCartesian(p5);

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

    topN = Cesium.Cartesian3.negate(topN, new Cesium.Cartesian3());

    this.normals.push(topN);
    this.normals.push(bottomN);

    if (clipDirection == -1) {
      var normals = this.normals.map((n) => {
        return Cesium.Cartesian3.negate(n, new Cesium.Cartesian3());
      });
    } else {
      var normals = this.normals;
    }

    var plane1 = new Cesium.Plane.fromPointNormal(this.points[0], normals[0]);
    var plane2 = new Cesium.Plane.fromPointNormal(this.points[1], normals[1]);
    var plane3 = new Cesium.Plane.fromPointNormal(this.points[2], normals[2]);
    var plane4 = new Cesium.Plane.fromPointNormal(this.points[0], normals[3]);

    var plane5 = new Cesium.Plane.fromPointNormal(p5, normals[4]);
    var plane6 = new Cesium.Plane.fromPointNormal(this.points[0], normals[5]);

    this.planes = [plane1, plane2, plane3, plane4, plane5, plane6];

    this.cPlanes = this.planes.map((plane) => {
      return new Cesium.ClippingPlane(plane.normal, plane.distance);
    });

    const clippingPlaneCollection = new Cesium.ClippingPlaneCollection({
      planes: this.cPlanes,
      unionClippingRegions: clipDirection == 1 ? true : false,
      enabled: true,
    });

    clippingPlaneCollection.modelMatrix =
      this.inverseClippingPlanesOriginMatrix;

    this.tileset.clippingPlanes = clippingPlaneCollection;

    this.destroy();

    var box = new cropBox(this.data);
    if (!document.getElementById(`crop-checkbox-${this.data.id}`).checked)
      box.toggleVisibilityOff();
    box.keepBoxAboveGround = cropBoxes[this.data.id].keepBoxAboveGround;

    var topPoint = Cesium.Cartesian3.clone(
      Cesium.Cartographic.toCartesian(this.positions[1]),
      new Cesium.Cartesian3()
    );
    topPoint = Cesium.Cartographic.fromCartesian(topPoint);
    topPoint.height = this.polygon.polygon.extrudedHeight.getValue();
    box.trs.translation = Cesium.Cartesian3.midpoint(
      Cesium.Cartographic.toCartesian(this.positions[0]),
      Cesium.Cartographic.toCartesian(topPoint),
      new Cesium.Cartesian3()
    );

    var scale = new Cesium.Cartesian3(
      Math.abs(this.lenX),
      Math.abs(this.lenY),
      Math.abs(
        this.polygon.polygon.extrudedHeight.getValue() -
          this.polygon.polygon.height.getValue()
      )
    );

    box.trs.scale = scale;

    cropBoxes[this.data.id] = box;

    var val = document.getElementById(`crop-direction-${this.data.id}`).value;
    var clipDirection = val === "inside" ? -1 : 1;

    var clippingPlanes = box.tileset.clippingPlanes;

    clippingPlanes._planes.map((p) => {
      p.distance = Math.abs(p.distance) * clipDirection;
    });

    clippingPlanes.unionClippingRegions = val === "inside" ? false : true;

    box.updateBox();
    box.onChange({
      modelMatrix: box.modelMatrix,
      translationRotationScale: box.trs,
    });

    document.getElementById(`rectangle-btn-${this.data.id}`).style.color = null;
    document.getElementById(`draw-msg-${this.data.id}`).style.display = "none";
    delete cropRectangles[this.data.id];
  };

  getCoordinates = () => {
    if (this.positions[0] && this.positions[1]) {
      if (this.positions[0].longitude < this.positions[1].longitude) {
        var west = this.positions[0].longitude;
        var east = this.positions[1].longitude;
      } else {
        var west = this.positions[1].longitude;
        var east = this.positions[0].longitude;
      }

      if (this.positions[0].latitude < this.positions[1].latitude) {
        var south = this.positions[0].latitude;
        var north = this.positions[1].latitude;
      } else {
        var south = this.positions[1].latitude;
        var north = this.positions[0].latitude;
      }
      var coords = [
        west,
        south,
        east,
        south,
        east,
        north,
        west,
        north,
        west,
        south,
      ];

      var cartesianCoords = new Cesium.Cartesian3.fromRadiansArray(coords);

      var cartoCoords =
        Cesium.Ellipsoid.WGS84.cartesianArrayToCartographicArray(
          cartesianCoords
        );

      return cartoCoords;
    }
  };

  destroy = () => {
    this.eventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
    this.eventHandler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    viewer.entities.remove(this.polygon);

    if (this.tileset.clippingPlanes)
      this.tileset.clippingPlanes.enabled = false;

    viewer.scene.screenSpaceCameraController.enableInputs = true;

    this.drawing = false;
    this.drawingHeight = false;
  };
}
