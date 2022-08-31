import { tilesets, viewer } from "./State.js";
//taken and modified from terriajs

const CORNER_POINT_VECTORS = [
    new Cesium.Cartesian3(0.5, 0.5, 0.5),
    new Cesium.Cartesian3(0.5, -0.5, 0.5),
    new Cesium.Cartesian3(-0.5, -0.5, 0.5),
    new Cesium.Cartesian3(-0.5, 0.5, 0.5)
];

const FACE_POINT_VECTORS = [
    new Cesium.Cartesian3(0.5, 0.0, 0.0),
    new Cesium.Cartesian3(0.0, 0.5, 0.0),
    new Cesium.Cartesian3(0.0, 0.0, 0.5)
];

const SCALE_POINT_VECTORS = [...CORNER_POINT_VECTORS, ...FACE_POINT_VECTORS];

const SIDE_PLANES = [
    new Cesium.Plane(new Cesium.Cartesian3(0, 0, 1), 0.5),
    new Cesium.Plane(new Cesium.Cartesian3(0, 0, -1), 0.5),
    new Cesium.Plane(new Cesium.Cartesian3(0, 1, 0), 0.5),
    new Cesium.Plane(new Cesium.Cartesian3(0, -1, 0), 0.5),
    new Cesium.Plane(new Cesium.Cartesian3(1, 0, 0), 0.5),
    new Cesium.Plane(new Cesium.Cartesian3(-1, 0, 0), 0.5)
];
const scratchMouseVector2d = new Cesium.Cartesian2();
const scratchScreenVector2d = new Cesium.Cartesian2();
const scratchScreenNormal2d = new Cesium.Cartesian2();
const scratchNearPoint2d = new Cesium.Cartesian2();
const scratchFarPoint2d = new Cesium.Cartesian2();
const scratchRay = new Cesium.Ray();

export class cropBox {
    updateEntitiesOnOrientationChange = () => {
        this.sides.forEach(side => side.updateOnCameraChange());
        this.scalePoints.forEach(scalePoint => scalePoint.updateOnCameraChange());
    }

    onChange = ({ modelMatrix }) => {
        Cesium.Matrix4.multiply(
            this.inverseClippingPlanesOriginMatrix,
            modelMatrix,
            this.clippingPlaneModelMatrix
        );
    }

    updateTerrainHeightEstimate = (() => {
        const scratchBoxCenter = new Cesium.Cartographic();
        const scratchFloor = new Cesium.Cartographic();

        return async (forceUpdate = false) => {
            if (!this.keepBoxAboveGround) {
                return;
            }

            if (this.isHeightUpdateInProgress && !forceUpdate) {
                return;
            }

            const terrainProvider = viewer.scene.terrainProvider;
            if (terrainProvider instanceof Cesium.EllipsoidTerrainProvider) {
                this.terrainHeightEstimate = 0;
                return;
            }

            this.isHeightUpdateInProgress = true;
            const boxCenter = Cesium.Cartographic.fromCartesian(
                this.trs.translation,
                undefined,
                scratchBoxCenter
            );
            try {
                const [floor] = await Cesium.sampleTerrainMostDetailed(terrainProvider, [
                    Cesium.Cartographic.clone(boxCenter, scratchFloor)
                ]);
                if (floor.height !== undefined) {
                    this.terrainHeightEstimate = floor.height;
                }
            } finally {
                this.isHeightUpdateInProgress = false;
            }
        };
    })();

    moveBoxWithClamping = (() => {
        const scratchNewPosition = new Cesium.Cartesian3();
        const scratchCartographic = new Cesium.Cartographic();

        return (moveStep) => {
            const nextPosition = Cesium.Cartesian3.add(
                this.trs.translation,
                moveStep,
                scratchNewPosition
            );
            if (this.keepBoxAboveGround) {
                const cartographic = Cesium.Cartographic.fromCartesian(
                    nextPosition,
                    undefined,
                    scratchCartographic
                );
                const boxBottomHeight = cartographic.height - this.trs.scale.z / 2;
                const floorHeight = this.terrainHeightEstimate;
                if (boxBottomHeight < floorHeight) {
                    cartographic.height += floorHeight - boxBottomHeight;
                    Cesium.Cartographic.toCartesian(cartographic, undefined, nextPosition);
                }
            }
            Cesium.Cartesian3.clone(nextPosition, this.trs.translation);
        };
    })();

    setBoxAboveGround = () => {
        if (!this.keepBoxAboveGround) {
            return;
        }

        this.updateTerrainHeightEstimate(true).then(() => {
            this.moveBoxWithClamping(Cesium.Cartesian3.ZERO);
            this.updateBox();
            this.onChange({
                modelMatrix: this.modelMatrix,
                translationRotationScale:this.trs
            });
        });
    }

    updateBox = () => {
        Cesium.Matrix4.fromTranslationRotationScale(this.trs, this.modelMatrix);
        this.dataSource.entities.values.forEach(entity => {
            if (this.isUpdatable(entity)) entity.update();
        });
    }


    screenProjectVector(
        scene,
        position,
        direction,
        length,
        result
    ) {
        const ray = scratchRay;
        ray.origin = position;
        ray.direction = direction;
        const nearPoint2d = scene.cartesianToCanvasCoordinates(
            Cesium.Ray.getPoint(ray, 0),
            scratchNearPoint2d
        );

        const farPoint2d = scene.cartesianToCanvasCoordinates(
            Cesium.Ray.getPoint(ray, length),
            scratchFarPoint2d
        );

        var result = new Cesium.Cartesian2();
        const screenVector2d = Cesium.Cartesian2.subtract(farPoint2d, nearPoint2d, result);
        return screenVector2d;
    }

    isUpdatable(entity) {
        return entity.update && typeof entity.update === "function";
    }

    setPlaneDimensions(
        boxDimensions,
        planeNormalAxis,
        planeDimensions
    ) {
        if (planeNormalAxis === Cesium.Axis.X) {
            planeDimensions.x = boxDimensions.y;
            planeDimensions.y = boxDimensions.z;
        } else if (planeNormalAxis === Cesium.Axis.Y) {
            planeDimensions.x = boxDimensions.x;
            planeDimensions.y = boxDimensions.z;
        } else if (planeNormalAxis === Cesium.Axis.Z) {
            planeDimensions.x = boxDimensions.x;
            planeDimensions.y = boxDimensions.y;
        }
    }

    createSide = (planeLocal) => {
        const plane = new Cesium.Plane(new Cesium.Cartesian3(), 0);
        const planeDimensions = new Cesium.Cartesian3();
        const normalAxis = planeLocal.normal.x
            ? Cesium.Axis.X
            : planeLocal.normal.y
                ? Cesium.Axis.Y
                : Cesium.Axis.Z;
        const style = {
            fillColor: Cesium.Color.WHITE.withAlpha(0.1),
            outlineColor: Cesium.Color.WHITE,
            highlightFillColor: Cesium.Color.WHITE.withAlpha(0.1),
            highlightOutlineColor: Cesium.Color.LIGHTGREEN
        };
        let isHighlighted = false;
        const scratchScaleMatrix = new Cesium.Matrix4();

        const update = () => {
            this.setPlaneDimensions(this.trs.scale, normalAxis, planeDimensions);

            const scaleMatrix = Cesium.Matrix4.fromScale(this.trs.scale, scratchScaleMatrix);
            Cesium.Plane.transform(planeLocal, scaleMatrix, plane);
        };

        const side = new Cesium.Entity({
            position: new Cesium.CallbackProperty(() => this.trs.translation, false),
            orientation: new Cesium.CallbackProperty(() => this.trs.rotation, false),
            plane: {
                show: true,
                plane: new Cesium.CallbackProperty(() => plane, false),
                dimensions: new Cesium.CallbackProperty(() => planeDimensions, false),
                fill: true,
                material: new Cesium.ColorMaterialProperty(
                    new Cesium.CallbackProperty(
                        () => (isHighlighted ? style.highlightFillColor : style.fillColor),
                        false
                    )
                ),
                outline: true,
                outlineColor: new Cesium.CallbackProperty(
                    () =>
                        (isHighlighted
                            ? style.highlightOutlineColor
                            : style.outlineColor
                        ).withAlpha(side.isFacingCamera ? 1 : 0.2),
                    false
                ),
                outlineWidth: 1
            }
        });

        var computeMoveAmount = (
            scene,
            position,
            direction,
            mouseMove
        ) => {
            const mouseVector2d = Cesium.Cartesian2.subtract(
                mouseMove.endPosition,
                mouseMove.startPosition,
                scratchMouseVector2d
            );

            const scratchScreenVector2d = new Cesium.Cartesian2();
            const scratchScreenNormal2d = new Cesium.Cartesian2();

            const screenVector2d = this.screenProjectVector(
                scene,
                position,
                direction,
                1,
                scratchScreenVector2d
            );

            const screenNormal2d = Cesium.Cartesian2.normalize(
                screenVector2d,
                scratchScreenNormal2d
            );
            const moveAmountPixels = Cesium.Cartesian2.dot(mouseVector2d, screenNormal2d);
            const pixelsPerStep = Cesium.Cartesian2.magnitude(screenVector2d);
            const moveAmount = moveAmountPixels / pixelsPerStep;
            return moveAmount;
        }
        const scratchCartographic = new Cesium.Cartographic();

        function projectPointToSurface(
            position,
            result
        ) {
            const cartographic = Cesium.Cartographic.fromCartesian(
                position,
                undefined,
                scratchCartographic
            );
            cartographic.height = 0;
            return Cesium.Cartographic.toCartesian(cartographic, undefined, result);
        }

        const scratchPickRay = new Cesium.Ray();
        function screenToGlobePosition(
            scene,
            position,
            result
        ) {
            const pickRay = scene.camera.getPickRay(position, scratchPickRay);
            const globePosition = scene.globe.pick(pickRay, scene, result);
            return globePosition;
        }

        const axis = planeLocal.normal.x
            ? Cesium.Axis.X
            : planeLocal.normal.y
                ? Cesium.Axis.Y
                : Cesium.Axis.Z;

        const scratchDirection = new Cesium.Cartesian3();
        const scratchMoveVector = new Cesium.Cartesian3();
        const scratchPreviousPosition = new Cesium.Cartesian3();
        const scratchEndPosition = new Cesium.Cartesian3();
        const scratchMoveStep = new Cesium.Cartesian3();
        const scratchSurfacePoint = new Cesium.Cartesian3();
        const scratchSurfacePoint2d = new Cesium.Cartesian2();

        var moveBoxWithClamping = (() => {
            const scratchNewPosition = new Cesium.Cartesian3();
            const scratchCartographic = new Cesium.Cartographic();

            return (moveStep) => {
                const nextPosition = Cesium.Cartesian3.add(
                    this.trs.translation,
                    moveStep,
                    scratchNewPosition
                );
                if (this.keepBoxAboveGround) {
                    const cartographic = Cesium.Cartographic.fromCartesian(
                        nextPosition,
                        undefined,
                        scratchCartographic
                    );
                    const boxBottomHeight = cartographic.height - this.trs.scale.z / 2;
                    const floorHeight = this.terrainHeightEstimate;
                    if (boxBottomHeight < floorHeight) {
                        cartographic.height += floorHeight - boxBottomHeight;
                        Cesium.Cartographic.toCartesian(cartographic, undefined, nextPosition);
                    }
                }
                Cesium.Cartesian3.clone(nextPosition, this.trs.translation);
            };
        })();

        const moveBoxOnDragSide = (mouseMove) => {
            const moveUpDown = axis === Cesium.Axis.Z;

            let moveStep = scratchMoveStep;

            const direction = Cesium.Cartesian3.normalize(
                Cesium.Matrix4.multiplyByPointAsVector(
                    this.modelMatrix,
                    plane.normal,
                    scratchDirection
                ),
                scratchDirection
            );

            if (moveUpDown) {
                const moveAmount = computeMoveAmount(
                    viewer.scene,
                    this.trs.translation,
                    direction,
                    mouseMove
                );

                const moveVector = Cesium.Cartesian3.multiplyByScalar(
                    direction,
                    moveAmount,
                    scratchMoveVector
                );

                moveStep = moveVector;
            } else {
                const origin = this.trs.translation;
                const surfacePoint = projectPointToSurface(origin, scratchSurfacePoint);
                const surfacePoint2d = viewer.scene.cartesianToCanvasCoordinates(
                    surfacePoint,
                    scratchSurfacePoint2d
                );

                if (!surfacePoint2d) {
                    return;
                }

                const yDiff = mouseMove.endPosition.y - mouseMove.startPosition.y;
                mouseMove.startPosition.y = surfacePoint2d.y;
                mouseMove.endPosition.y = surfacePoint2d.y + yDiff;

                const previousPosition = screenToGlobePosition(
                    viewer.scene,
                    mouseMove.startPosition,
                    scratchPreviousPosition
                );
                const endPosition = screenToGlobePosition(
                    viewer.scene,
                    mouseMove.endPosition,
                    scratchEndPosition
                );

                if (!previousPosition || !endPosition) {
                    return;
                }
                moveStep = Cesium.Cartesian3.subtract(endPosition, previousPosition, moveStep);
            }

            this.updateTerrainHeightEstimate();
            moveBoxWithClamping(moveStep);
            this.updateBox();
            this.onChange({
                modelMatrix: this.modelMatrix,
                translationRotationScale: this.trs
            });
        };

        const highlightSide = () => {
            isHighlighted = true;
        };

        const unHighlightSide = () => {
            isHighlighted = false;
        };

        const highlightAllSides = () =>
            this.sides.forEach(side => side.highlight());
        const unHighlightAllSides = () =>
            this.sides.forEach(side => side.unHighlight());

        const onMouseOver = () => {
            highlightAllSides();
            this.setCanvasCursor(viewer.scene, "grab");
        };

        const onMouseOut = () => {
            unHighlightAllSides();
            this.setCanvasCursor(viewer.scene, "auto");
        };

        var onPick = () => {
            highlightAllSides();
            this.setCanvasCursor(viewer.scene, "grabbing");
        }

        var onRelease = () => {
            this.setBoxAboveGround();
            unHighlightAllSides();
            this.setCanvasCursor(viewer.scene, "auto");
            this.onChange({
                modelMatrix: this.modelMatrix,
                translationRotationScale: this.trs,
            });
        }

        const scratchNormal = new Cesium.Cartesian3();
        const updateOnCameraChange = () => {
            const normalWc = Cesium.Cartesian3.normalize(
                Cesium.Matrix4.multiplyByPointAsVector(
                    this.modelMatrix,
                    plane.normal,
                    scratchNormal
                ),
                scratchNormal
            );
            side.isFacingCamera =
                Cesium.Cartesian3.dot(normalWc, viewer.scene.camera.direction) >= 0;
        };

        side.onMouseOver = onMouseOver;
        side.onMouseOut = onMouseOut;
        side.onPick = onPick;
        side.onRelease = onRelease;
        side.highlight = highlightSide;
        side.unHighlight = unHighlightSide;
        side.onDrag = moveBoxOnDragSide;
        side.update = update;
        side.updateOnCameraChange = updateOnCameraChange;
        side.isFacingCamera = false;
        side.isSide = true;
        update();
        return side
    }


    createScalePoint = (pointLocal) => {
        const pos = new Cesium.Cartesian3();
        const style = {
            cornerPointColor: Cesium.Color.fromCssColorString("rgb(91, 139, 81)"),
            facePointColor: Cesium.Color.fromCssColorString("#C55034"),
            dimPointColor: Cesium.Color.GREY.withAlpha(0.2)
        };
        let isFacingCamera = true;

        const update = () => {
            Cesium.Matrix4.multiplyByPoint(this.modelMatrix, pointLocal, pos);
        };

        var scalePoint = this.dataSource.entities.add({
            position: new Cesium.CallbackProperty(() => pos, false),
            model: {
                uri: "/cesium/Apps/ASDC/Box.glb",
                minimumPixelSize: 12,
                color: new Cesium.CallbackProperty(() => getColor(), false),
                colorBlendMode: Cesium.ColorBlendMode.REPLACE,
                shadows: Cesium.ShadowMode.DISABLED
            },
        })

        const axisLocal = Cesium.Cartesian3.normalize(pointLocal, new Cesium.Cartesian3());
        const xDot = Math.abs(Cesium.Cartesian3.dot(new Cesium.Cartesian3(1, 0, 0), axisLocal));
        const yDot = Math.abs(Cesium.Cartesian3.dot(new Cesium.Cartesian3(0, 1, 0), axisLocal));
        const zDot = Math.abs(Cesium.Cartesian3.dot(new Cesium.Cartesian3(0, 0, 1), axisLocal));
        const cursorDirection =
            xDot === 1 || yDot === 1
                ? "ew-resize"
                : zDot === 1
                    ? "ns-resize"
                    : "nesw-resize";

        const isCornerPoint = xDot && yDot && zDot;
        const isProportionalScaling = isCornerPoint;

        const getColor = () => {
            return isFacingCamera
                ? isCornerPoint
                    ? style.cornerPointColor
                    : style.facePointColor
                : style.dimPointColor;
        };

        const highlightScalePoint = () => {
            const model = scalePoint.model;
            model.silhouetteColor = Cesium.Color.LIGHTGREEN;
            model.silhouetteSize = 1;
        };

        const unHighlightScalePoint = () => {
            const model = scalePoint.model;
            model.silhouetteColor = undefined;
            model.silhouetteSize = 0;
        };

        const onMouseOver = () => {
            scalePoint.axisLine.show = true;
            highlightScalePoint();
            this.setCanvasCursor(viewer.scene, cursorDirection);
        };

        const onMouseOut = () => {
            scalePoint.axisLine.show = false;
            unHighlightScalePoint();
            this.setCanvasCursor(viewer.scene, "auto");
        };

        var onPick = () => {
            scalePoint.axisLine.show = true;
            highlightScalePoint();
            this.setCanvasCursor(viewer.scene, cursorDirection);
        }

        var onRelease = () => {
            scalePoint.axisLine.show = false;
            unHighlightScalePoint();
            this.onChange({
                modelMatrix: this.modelMatrix,
                translationRotationScale: this.trs,
            });
            this.setCanvasCursor(viewer.scene, "auto");
        }

        var computeScaleAmount = (
            scene,
            position,
            direction,
            length,
            mouseMove
        ) => {
            const mouseVector2d = Cesium.Cartesian2.subtract(
                mouseMove.endPosition,
                mouseMove.startPosition,
                scratchMouseVector2d
            );

            const screenVector2d = this.screenProjectVector(
                scene,
                position,
                direction,
                1,
                scratchScreenVector2d
            );

            const screenNormal2d = Cesium.Cartesian2.normalize(
                screenVector2d,
                scratchScreenNormal2d
            );

            const pixelsPerStep = Cesium.Cartesian2.magnitude(screenVector2d);
            const moveAmountPixels = Cesium.Cartesian2.dot(mouseVector2d, screenNormal2d);
            const moveAmount = moveAmountPixels / pixelsPerStep;
            const scaleAmount = moveAmount / length;
            const pixelLengthAfterScaling =
                pixelsPerStep * length + pixelsPerStep * length * scaleAmount;
            return { scaleAmount, pixelLengthAfterScaling };
        }

        const proportionalScalingAxis = new Cesium.Cartesian3(1, 1, 1);

        const scratchOppositePosition = new Cesium.Cartesian3();
        const scratchAxisVector = new Cesium.Cartesian3();
        const scratchMoveDirection = new Cesium.Cartesian3();
        const scratchMultiply = new Cesium.Cartesian3();
        const scratchAbs = new Cesium.Cartesian3();
        const scratchScaleStep = new Cesium.Cartesian3();
        const scratchMoveStep = new Cesium.Cartesian3();
        const scratchCartographic = new Cesium.Cartographic();

        const scaleBoxOnDrag = (mouseMove) => {
            const oppositePosition = scalePoint.oppositeScalePoint.position.getValue(
                Cesium.JulianDate.now(),
                scratchOppositePosition
            );

            const axisVector = Cesium.Cartesian3.subtract(
                pos,
                oppositePosition,
                scratchAxisVector
            );

            const length = Cesium.Cartesian3.magnitude(axisVector);
            const scaleDirection = Cesium.Cartesian3.normalize(
                axisVector,
                scratchMoveDirection
            );

            const { scaleAmount, pixelLengthAfterScaling } = computeScaleAmount(
                viewer.scene,
                pos,
                scaleDirection,
                length,
                mouseMove
            );

            if (scaleAmount < 0) {
                const isDiagonal = axisLocal.x && axisLocal.y && axisLocal.y;
                const pixelSideLengthAfterScaling = isDiagonal
                    ? pixelLengthAfterScaling / Math.sqrt(2)
                    : pixelLengthAfterScaling;
                if (pixelSideLengthAfterScaling < 20) {
                    return;
                }
            }

            const scaleStep = Cesium.Cartesian3.multiplyByScalar(
                Cesium.Cartesian3.abs(
                    Cesium.Cartesian3.multiplyComponents(
                        this.trs.scale,
                        isProportionalScaling ? proportionalScalingAxis : axisLocal,
                        scratchMultiply
                    ),
                    scratchAbs
                ),
                scaleAmount,
                scratchScaleStep
            );

            const moveStep = Cesium.Cartesian3.multiplyByScalar(
                axisVector,
                scaleAmount / 2,
                scratchMoveStep
            );

            const isDraggingBottomScalePoint = axisLocal.z < 0;
            const isUpscaling = scaleAmount > 0;
            if (
                this.keepBoxAboveGround &&
                isUpscaling &&
                isDraggingBottomScalePoint
            ) {
                const boxCenterHeight = Cesium.Cartographic.fromCartesian(
                    this.trs.translation,
                    undefined,
                    scratchCartographic
                ).height;
                const bottomHeight = boxCenterHeight - this.trs.scale.z / 2;
                const bottomHeightAfterScaling = bottomHeight - Math.abs(moveStep.z);
                if (bottomHeightAfterScaling < 0) {
                    scaleStep.z = 0;
                }
            }

            Cesium.Cartesian3.add(this.trs.scale, scaleStep, this.trs.scale);

            this.moveBoxWithClamping(moveStep);

            this.updateBox();

            this.onChange({
                modelMatrix: this.modelMatrix,
                translationRotationScale: this.trs
            });
        };

        const adjacentSides = this.sides.filter(side => {
            const plane = side.plane.plane?.getValue(Cesium.JulianDate.now());
            const isAdjacent = Cesium.Cartesian3.dot(plane.normal, axisLocal) < 0;
            return isAdjacent;
        });

        const updateOnCameraChange = () => {
            isFacingCamera = adjacentSides.some(side => side.isFacingCamera);
        };

        scalePoint.onPick = onPick;
        scalePoint.onRelease = onRelease;
        scalePoint.onMouseOver = onMouseOver;
        scalePoint.onMouseOut = onMouseOut;
        scalePoint.onDrag = scaleBoxOnDrag;
        scalePoint.update = update;
        scalePoint.updateOnCameraChange = updateOnCameraChange;
        update();
        return scalePoint;
    }

    isInteractable(entity) {
        return (
            typeof entity.onPick === "function" &&
            typeof entity.onRelease === "function" &&
            typeof entity.onMouseOver === "function" &&
            typeof entity.onMouseOut === "function"
        );
    }

    handlePick = (click) => {
        const pick = viewer.scene.pick(click.position);
        const entity = pick?.id;
        if (entity === undefined || !this.isInteractable(entity)) {
            return;
        }

        viewer.scene.screenSpaceCameraController.enableInputs = false;
        if (this.state.is === "hovering") {
            this.state.entity.onMouseOut({
              startPosition: click.position,
              endPosition: click.position
            });
        }
        this.state = { is: "picked", entity };
        entity.onPick(click);
    };

    handleRelease = (click) => {
        if (this.state.is === "picked") {
            viewer.scene.screenSpaceCameraController.enableInputs = true;
            if (this.state.entity.onRelease) this.state.entity.onRelease(click);
            this.state = { is: "none" };
        }
    };

    detectHover = (mouseMove) => {
        const pick = viewer.scene.pick(mouseMove.endPosition);
        const entity = pick?.id;
        if (entity === undefined || !this.isInteractable(entity)) {
            return;
        }

        this.state = { is: "hovering", entity };
        entity.onMouseOver(mouseMove);
    };

    handleMouseMove = (mouseMove) => {
        if (this.state.is === "none") {
            this.detectHover(mouseMove);
        } else if (this.state.is === "hovering") {
            const pick = viewer.scene.pick(mouseMove.endPosition);
            const entity = pick?.id;
            if (entity !== this.state.entity) {
                this.state.entity.onMouseOut(mouseMove);
                if (entity && this.isInteractable(entity)) {
                    this.state = { is: "hovering", entity };
                    entity.onMouseOver(mouseMove);
                } else {
                    this.state = { is: "none" };
                }
            }
        } else if (this.state.is === "picked") {
            if (this.state.entity.onDrag) this.state.entity.onDrag(mouseMove);
        }
    };

    createScaleAxisLine = (
        scalePoint1,
        scalePoint2
    ) => {
        const position1 = scalePoint1.position?.getValue(Cesium.JulianDate.now());
        const position2 = scalePoint2.position?.getValue(Cesium.JulianDate.now());
        const scaleAxis = new Cesium.Entity({
            show: false,
            polyline: {
                positions: new Cesium.CallbackProperty(
                    () => [position1, position2],
                    false
                ),
                material: new Cesium.PolylineDashMaterialProperty({
                    color: Cesium.Color.LIGHTGREEN,
                    dashLength: 8
                }),
                arcType: Cesium.ArcType.NONE
            }
        });

        return scaleAxis;
    }

    createEdge = (localEdge) => {
        const position1 = new Cesium.Cartesian3();
        const position2 = new Cesium.Cartesian3();
        const positions = [position1, position2];

        const style = {
            color: Cesium.Color.WHITE.withAlpha(0.1),
            highlightColor: Cesium.Color.fromCssColorString("rgb(91, 139, 81)").withAlpha(0.7)
        };

        const isDraggableEdge = localEdge[1].z - localEdge[0].z !== 0;

        const update = () => {
            Cesium.Matrix4.multiplyByPoint(this.modelMatrix, localEdge[0], position1);
            Cesium.Matrix4.multiplyByPoint(this.modelMatrix, localEdge[1], position2);
        };

        let isHighlighted = false;

        const edge = new Cesium.Entity({
            polyline: {
                show: true,
                positions: new Cesium.CallbackProperty(() => positions, false),
                width: new Cesium.CallbackProperty(() => (isDraggableEdge ? 10 : 0), false),
                material: new Cesium.ColorMaterialProperty(
                    new Cesium.CallbackProperty(
                        () => (isHighlighted ? style.highlightColor : style.color),
                        false
                    )
                ),
                arcType: Cesium.ArcType.NONE
            }
        })

        const onMouseOver = () => {
            if (isDraggableEdge) {
                isHighlighted = true;
                this.setCanvasCursor(viewer.scene, "pointer");
            }
        };

        const onMouseOut = () => {
            if (isDraggableEdge) {
                isHighlighted = false;
                this.setCanvasCursor(viewer.scene, "auto");
            }
        };

        const onPick = () => {
            if (isDraggableEdge) {
              isHighlighted = true;
              this.setCanvasCursor(viewer.scene, "pointer");
            }
          };
      
        const onRelease = () => {
        if (isDraggableEdge) {
            isHighlighted = false;
            this.setCanvasCursor(viewer.scene, "auto");
            this.onChange({
                modelMatrix: this.modelMatrix,
                translationRotationScale: this.trs
            });
        }
        };

        const scratchHpr = new Cesium.HeadingPitchRoll(0, 0, 0);

        const rotateBoxOnDrag = (mouseMove) => {
            if (!isDraggableEdge) {
                return;
            }

            const dx = mouseMove.endPosition.x - mouseMove.startPosition.x;
            const sensitivity = 0.05;
            const hpr = scratchHpr;
            hpr.heading = -dx * sensitivity;
            hpr.pitch = 0;
            hpr.roll = 0;

            Cesium.Quaternion.multiply(
                this.trs.rotation,
                Cesium.Quaternion.fromHeadingPitchRoll(hpr),
                this.trs.rotation
            );

            this.updateBox();
            this.updateEntitiesOnOrientationChange();
            this.onChange({
                isFinished: false,
                modelMatrix: this.modelMatrix,
                translationRotationScale: this.trs
            });
        };

        edge.update = update;
        edge.onMouseOver = onMouseOver;
        edge.onMouseOut = onMouseOut;
        edge.onDrag = rotateBoxOnDrag;
        edge.onPick = onPick;
        edge.onRelease = onRelease;
        update();


        return edge;
    }

    setCanvasCursor(scene, cursorType) {
        scene.canvas.style.cursor = cursorType;
    }

    toggleVisibilityOn(){
        this.sides.map(e => { e.show = true; })
        this.scalePoints.map(e => { e.show = true; })
        this.edges.map(e => { e.show = true; })
    }
    toggleVisibilityOff(){
        this.sides.map(e => { e.show = false; })
        this.scalePoints.map(e => { e.show = false; })
        this.edges.map(e => { e.show = false; })
    }
    toggleVisibility(){
        this.sides.map(e => { e.show = !e.show; })
        this.scalePoints.map(e => { e.show = !e.show; })
        this.edges.map(e => { e.show = !e.show; })
    }
    
    toggleEnable(){
        this.tileset.clippingPlanes.enabled = !this.tileset.clippingPlanes.enabled;
        
        if (this.tileset.clippingPlanes.enabled) {
            this.toggleVisibilityOn();
        } else {
            this.toggleVisibilityOff();
        }
    }

    toggleAboveGround(){
        this.keepBoxAboveGround =!this.keepBoxAboveGround;
        if (this.keepBoxAboveGround)
            this.setBoxAboveGround();
    }

    constructor(data) {
        this.scalePoints = [];
        this.sides = [];
        this.edges=[];
        this.terrainHeightEstimate = 0;
        this.isHeightUpdateInProgress = false;
        this.keepBoxAboveGround = true;
        this.state = { is: "none" };
        this.tileset = tilesets[data.asset.id][data.id];

        this.dataSource = new Cesium.CustomDataSource();
        viewer.dataSources.add(this.dataSource);

        var clippingPlanesOriginMatrix = tilesets[data.asset.id][data.id].clippingPlanesOriginMatrix;
        this.dimensions = new Cesium.Cartesian3(100, 100, 100);

        let position;
        const cartographic = Cesium.Cartographic.fromCartesian(
            Cesium.Matrix4.getTranslation(clippingPlanesOriginMatrix, new Cesium.Cartesian3())
        );

        position = Cesium.Cartographic.toCartesian(
            cartographic,
            viewer.scene.globe.ellipsoid,
            new Cesium.Cartesian3()
        );

        var hpr;
        const boxTransform = Cesium.Matrix4.multiply(
            hpr
                ? Cesium.Matrix4.fromRotationTranslation(
                    Cesium.Matrix3.fromHeadingPitchRoll(hpr),
                    position
                )
                : Cesium.Transforms.eastNorthUpToFixedFrame(position),
            Cesium.Matrix4.fromScale(this.dimensions, new Cesium.Matrix4()),
            new Cesium.Matrix4()
        );

        this.modelMatrix = Cesium.Matrix4.IDENTITY.clone();
        this.inverseClippingPlanesOriginMatrix = Cesium.Matrix4.inverse(clippingPlanesOriginMatrix, new Cesium.Matrix4())

        this.clippingPlaneModelMatrix = Cesium.Matrix4.IDENTITY.clone();
        Cesium.Matrix4.multiply(
            this.inverseClippingPlanesOriginMatrix,
            boxTransform,
            this.clippingPlaneModelMatrix
        );

        this.trs = new Cesium.TranslationRotationScale();
        var worldTransform = Cesium.Matrix4.IDENTITY.clone();
        Cesium.Matrix4.clone(boxTransform, worldTransform);

        Cesium.Matrix4.getTranslation(worldTransform, this.trs.translation);
        Cesium.Matrix4.getScale(worldTransform, this.trs.scale);
        Cesium.Quaternion.fromRotationMatrix(
            Cesium.Matrix3.getRotation(
                Cesium.Matrix4.getMatrix3(worldTransform, new Cesium.Matrix3()),
                new Cesium.Matrix3()
            ),
            this.trs.rotation
        );

        const eventHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        eventHandler.setInputAction(this.handlePick, Cesium.ScreenSpaceEventType.LEFT_DOWN);
        eventHandler.setInputAction(this.handleRelease, Cesium.ScreenSpaceEventType.LEFT_UP);
        eventHandler.setInputAction(this.handleMouseMove, Cesium.ScreenSpaceEventType.MOUSE_MOVE
        );

        SIDE_PLANES.forEach(sideLocal => {
            const side = this.createSide(sideLocal);
            this.sides.push(side);

            this.dataSource.entities.add(side);
        });

        SCALE_POINT_VECTORS.forEach(vector => {
            const pointLocal1 = vector;
            const pointLocal2 = Cesium.Cartesian3.multiplyByScalar(
                vector,
                -1,
                new Cesium.Cartesian3()
            );
            const scalePoint1 = this.createScalePoint(pointLocal1);
            const scalePoint2 = this.createScalePoint(pointLocal2);
            scalePoint1.oppositeScalePoint = scalePoint2;
            scalePoint2.oppositeScalePoint = scalePoint1;
            const axisLine = this.createScaleAxisLine(scalePoint1, scalePoint2);
            scalePoint1.axisLine = axisLine;
            scalePoint2.axisLine = axisLine;

            this.dataSource.entities.add(axisLine);
            this.scalePoints.push(scalePoint1, scalePoint2);
        });

        const localEdges = [];
        CORNER_POINT_VECTORS.map((vector, i) => {
            const upPoint = vector;
            const downPoint = Cesium.Cartesian3.clone(upPoint, new Cesium.Cartesian3());
            downPoint.z *= -1;

            const nextUpPoint = CORNER_POINT_VECTORS[(i + 1) % 4];
            const nextDownPoint = Cesium.Cartesian3.clone(nextUpPoint, new Cesium.Cartesian3());
            nextDownPoint.z *= -1;

            const verticalEdge = [upPoint, downPoint];
            const topEdge = [nextUpPoint, upPoint];
            const bottomEdge = [nextDownPoint, downPoint];
            localEdges.push(verticalEdge, topEdge, bottomEdge);
        });

        localEdges.forEach(localEdge => {
            const edge = this.createEdge(localEdge);
            this.dataSource.entities.add(edge);
            this.edges.push(edge);
        });

        const clipDirection = 1;

        const planes = SIDE_PLANES.map(plane => {
            return new Cesium.ClippingPlane(plane.normal, plane.distance * clipDirection);
        });
        const clippingPlaneCollection = new Cesium.ClippingPlaneCollection({
            planes,
            unionClippingRegions: true,
            enabled: true
        });

        this.setBoxAboveGround();

        clippingPlaneCollection.modelMatrix = this.clippingPlaneModelMatrix;
          
        this.tileset.clippingPlanes = clippingPlaneCollection;

        viewer.scene.camera.changed.addEventListener(this.updateEntitiesOnOrientationChange)
        this.updateEntitiesOnOrientationChange();
    }
}