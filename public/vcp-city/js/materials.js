// ============================================================================
// VCP 都市 · 赛博精密工业材质、程序化幕墙纹理与昼夜真光源系统
// 视觉升级：
//   1. Canvas 动态生成高密度赛博摩天楼发光窗格贴图 (避免乐高大色块感)
//   2. 地面与海面叠加精密拓扑测地线网格纹理
//   3. 部署真实夜间城市点光源群 (PointLight) + 配合 UnrealBloomPass 产生真霓虹光晕
// ============================================================================

import * as THREE from 'three';

export class CeramicMaterialSystem {
  constructor(scene) {
    this.scene = scene;
    this.isNight = false; // 默认白昼；主控在世界构建完成后统一应用光照与材质
    this.windowMaterials = [];
    this.glowMaterials = [];
    this.cityLights = [];
    this.ceramicCache = new Map();

    this._initProceduralTextures();
    this._initBaseMaterials();
    this._initLights();
  }

  // 动态生成高密度赛博大厦发光窗格纹理与精密地面网格纹理
  _initProceduralTextures() {
    // 1. 摩天楼玻璃幕墙与服务器机柜灯阵纹理 (暖金/青蓝双色系)
    this.facadeTexWarm = this._createFacadeTexture('#FFB74D', '#76BFAE', '#141A1D');
    this.facadeTexCyan = this._createFacadeTexture('#4FC3F7', '#76BFAE', '#10161B');
    this.facadeTexCore = this._createFacadeTexture('#F2A900', '#FF6E40', '#121518');

    // 2. 赛博测地线网格纹理 (用于陆地台地表面)
    this.gridTex = this._createGridTexture();
  }

  // 生成极简、克制的大尺度建筑夜间横向光带贴图 (仅用于夜晚 emissiveMap，绝不污染白天墙面颜色)
  _createFacadeTexture(primaryHex, secondaryHex) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // 纯黑底色 = 不发光区域保持建筑原本纯净瓷色
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 仅绘制 5 道干净、优雅的大跨度建筑环廊光槽 (告别碎乱码感)
    const bandRows = [64, 152, 248, 344, 432];
    bandRows.forEach((y, idx) => {
      const isAccent = idx === 1 || idx === 3;
      ctx.fillStyle = isAccent ? secondaryHex : primaryHex;
      ctx.globalAlpha = isAccent ? 0.92 : 0.72;

      // 左右留出边距的宽幅水平落地窗光带
      ctx.fillRect(28, y, 88, 12);
      ctx.fillRect(140, y, 88, 12);
    });
    ctx.globalAlpha = 1.0;

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  _createGridTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = '#76BFAE';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, 256, 256);

    ctx.strokeStyle = 'rgba(118, 191, 174, 0.35)';
    ctx.lineWidth = 1;
    for (let i = 64; i < 256; i += 64) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 256);
      ctx.moveTo(0, i);
      ctx.lineTo(256, i);
      ctx.stroke();
    }

    // 十字靶标
    ctx.fillStyle = '#F2A900';
    ctx.fillRect(126, 126, 4, 4);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(14, 14);
    return tex;
  }

  _initBaseMaterials() {
    // 沙盘外框与底板
    this.tableBaseMat = new THREE.MeshStandardMaterial({
      color: 0x0E1214,
      roughness: 0.45,
      metalness: 0.55,
    });

    this.tableTrimMat = new THREE.MeshStandardMaterial({
      color: 0xF2A900,
      emissive: 0xF2A900,
      emissiveIntensity: 0.85,
      roughness: 0.25,
      metalness: 0.4,
    });
    this.tableTrimMat.userData.baseIntensity = 0.6;
    this.glowMaterials.push(this.tableTrimMat);

    // 赛博深海镜面水体
    this.waterSurfaceMat = new THREE.MeshPhysicalMaterial({
      color: 0x0B2228,
      emissive: 0x071C21,
      emissiveIntensity: 0.35,
      transmission: 0.45,
      opacity: 0.86,
      transparent: true,
      roughness: 0.14,
      metalness: 0.35,
      ior: 1.38,
    });

    // 陆地台地 (带精密赛博测地线发光网格)
    this.islandLandMat = new THREE.MeshStandardMaterial({
      color: 0x1A2125,
      roughness: 0.55,
      metalness: 0.28,
      emissive: 0x76BFAE,
      emissiveMap: this.gridTex,
      emissiveIntensity: 0.28,
    });

    // 陆地侧壁装甲岩层
    this.islandCliffMat = new THREE.MeshStandardMaterial({
      color: 0x12171A,
      roughness: 0.7,
      metalness: 0.35,
    });

    // 地底深层基岩
    this.bedrockMat = new THREE.MeshStandardMaterial({
      color: 0x0A0D0F,
      roughness: 0.8,
      metalness: 0.3,
    });

    // 建筑精密装甲骨瓷墙体 (带微金属拉丝光泽，告别塑料感)
    this.wallCeramicMat = new THREE.MeshStandardMaterial({
      color: 0xDCE2E6,
      roughness: 0.32,
      metalness: 0.28,
    });

    // 深色赛博黑曜石装甲墙体
    this.darkCeramicMat = new THREE.MeshStandardMaterial({
      color: 0x182026,
      roughness: 0.26,
      metalness: 0.52,
    });

    // 建筑外骨骼立柱材质 (白天为温润浅暖灰，夜晚为深青灰金属)
    this.exoFrameMat = new THREE.MeshStandardMaterial({
      color: 0xD8D3C8,
      roughness: 0.42,
      metalness: 0.22,
    });

    // 建筑主体墙面材质：不绑定 map！白天是纯净温润的象牙白瓷，夜晚才点亮极简横向光带 emissiveMap
    this.facadeWarmMat = new THREE.MeshStandardMaterial({
      color: 0xF4F1EA,
      emissive: 0xFFFFFF,
      emissiveMap: this.facadeTexWarm,
      emissiveIntensity: 0.0,
      roughness: 0.42,
      metalness: 0.12,
    });
    this.facadeCyanMat = new THREE.MeshStandardMaterial({
      color: 0xF4F1EA,
      emissive: 0xFFFFFF,
      emissiveMap: this.facadeTexCyan,
      emissiveIntensity: 0.0,
      roughness: 0.38,
      metalness: 0.15,
    });
    this.facadeCoreMat = new THREE.MeshStandardMaterial({
      color: 0xEAE6DD,
      emissive: 0xFFFFFF,
      emissiveMap: this.facadeTexCore,
      emissiveIntensity: 0.0,
      roughness: 0.38,
      metalness: 0.18,
    });

    // 兼容旧引用的窗体发光材质
    this.windowWarmMat = new THREE.MeshStandardMaterial({
      color: 0xFFB74D,
      emissive: 0xFF9800,
      emissiveIntensity: 1.4,
      roughness: 0.2,
      metalness: 0.4,
    });
    this.windowCyanMat = new THREE.MeshStandardMaterial({
      color: 0x76BFAE,
      emissive: 0x26C6DA,
      emissiveIntensity: 1.5,
      roughness: 0.2,
      metalness: 0.4,
    });

    this.windowMaterials.push(
      this.facadeWarmMat,
      this.facadeCyanMat,
      this.facadeCoreMat,
      this.windowWarmMat,
      this.windowCyanMat
    );

    // 地面发光导轨道路材质
    this.roadMat = new THREE.MeshStandardMaterial({
      color: 0x222B30,
      emissive: 0x21675C,
      emissiveIntensity: 0.35,
      roughness: 0.4,
      metalness: 0.45,
    });
  }

  getGlazeMaterial(hexColor, options = {}) {
    const key = `${hexColor}_${options.emissive || 0}_${options.roughness || 0.25}`;
    if (this.ceramicCache.has(key)) return this.ceramicCache.get(key);

    const mat = new THREE.MeshStandardMaterial({
      color: hexColor,
      roughness: options.roughness ?? 0.24,
      metalness: options.metalness ?? 0.42,
      emissive: options.emissive ?? hexColor,
      emissiveIntensity: options.emissiveIntensity ?? 0.22,
    });
    mat.userData.baseIntensity = options.emissiveIntensity ?? 0.22;
    this.glowMaterials.push(mat);
    this.ceramicCache.set(key, mat);
    return mat;
  }

  // 高輝度霓虹能量材质 (配合 UnrealBloomPass 绽放辉光)
  getEnergyMaterial(hexColor, baseIntensity = 1.4) {
    const mat = new THREE.MeshStandardMaterial({
      color: hexColor,
      emissive: hexColor,
      emissiveIntensity: baseIntensity,
      roughness: 0.15,
      metalness: 0.2,
      transparent: true,
      opacity: 0.95,
    });
    mat.userData.baseIntensity = baseIntensity;
    this.glowMaterials.push(mat);
    return mat;
  }

  _initLights() {
    this.ambientLight = new THREE.HemisphereLight(0x8AB4F8, 0x0D1518, 0.65);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xFFF3DC, 1.1);
    this.sunLight.position.set(42, 68, 38);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 180;
    const d = 68;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);

    this.fillLight = new THREE.DirectionalLight(0x26C6DA, 0.55);
    this.fillLight.position.set(-45, 32, -30);
    this.scene.add(this.fillLight);

    // 地底河强力上照光源
    this.underworldLightWest = new THREE.PointLight(0x76BFAE, 2.8, 52);
    this.underworldLightWest.position.set(-22, -7.5, 0);
    this.scene.add(this.underworldLightWest);

    this.underworldLightEast = new THREE.PointLight(0x4A89DC, 2.6, 52);
    this.underworldLightEast.position.set(24, -7.5, 0);
    this.scene.add(this.underworldLightEast);

    // ========================================================================
    // 夜间真实城市街区点光源群 (让建筑立面与地面在夜里产生真实的彩色霓虹漫反射！)
    // ========================================================================
    const cityLightSpecs = [
      { pos: [-27, 16, -2], color: 0x26C6DA, intensity: 4.5, dist: 38 },  // 西城双子塔青蓝天光
      { pos: [-27, 5, 5], color: 0xFFB74D, intensity: 3.5, dist: 32 },    // 西城 AA 总线与插件灯海暖金光
      { pos: [-1, 6, 0], color: 0xF2A900, intensity: 3.2, dist: 28 },     // WS 跨海大桥金红光
      { pos: [26, 15, 0], color: 0x4A89DC, intensity: 5.0, dist: 42 },    // 东城中心 V 桌面电光蓝
      { pos: [18.5, 10, -7.5], color: 0xFFB74D, intensity: 3.2, dist: 26 }, // 文坊暖光
      { pos: [18.5, 10, 7.8], color: 0xF06292, intensity: 3.6, dist: 28 },  // 音乐舞台霓虹粉
      { pos: [34, 11, 6.5], color: 0xFF7043, intensity: 3.4, dist: 28 },    // 工程塔楼珊瑚橙
      { pos: [0, 9, -30], color: 0x9575CD, intensity: 4.0, dist: 32 },      // Comfy 算力不夜工坊紫光
    ];

    for (const ls of cityLightSpecs) {
      const pl = new THREE.PointLight(ls.color, ls.intensity, ls.dist, 1.5);
      pl.position.set(...ls.pos);
      pl.userData.nightIntensity = ls.intensity;
      this.scene.add(pl);
      this.cityLights.push(pl);
    }
  }

  // 切换昼夜 (石墨赛博星夜 ↔ 暖纸精密工业白昼)
  setNightMode(isNight) {
    this.isNight = isNight;

    if (isNight) {
      this.scene.background = new THREE.Color(0x0D1115); // 深邃石墨赛博夜空
      this.scene.fog = new THREE.FogExp2(0x0D1115, 0.0038);

      this.ambientLight.color.setHex(0x4A6B8A);
      this.ambientLight.groundColor.setHex(0x080B0E);
      this.ambientLight.intensity = 0.55;

      this.sunLight.color.setHex(0x64B5F6);
      this.sunLight.intensity = 0.48;

      this.fillLight.color.setHex(0x76BFAE);
      this.fillLight.intensity = 0.52;

      this.islandLandMat.color.setHex(0x161D21);
      this.islandLandMat.emissiveIntensity = 0.42;
      this.islandCliffMat.color.setHex(0x101518);
      this.roadMat.color.setHex(0x1B2428);
      this.roadMat.emissiveIntensity = 0.55;
      this.wallCeramicMat.color.setHex(0x283339);
      this.exoFrameMat.color.setHex(0x1C252B);
      this.waterSurfaceMat.color.setHex(0x091D22);

      // 夜晚墙体变为深邃青灰瓷，并点亮极简横向环廊光带
      this.facadeWarmMat.color.setHex(0x222B32);
      this.facadeCyanMat.color.setHex(0x1E2830);
      this.facadeCoreMat.color.setHex(0x1C242B);
      this.facadeWarmMat.emissiveIntensity = 1.25;
      this.facadeCyanMat.emissiveIntensity = 1.35;
      this.facadeCoreMat.emissiveIntensity = 1.45;
      this.windowWarmMat.emissiveIntensity = 1.5;
      this.windowCyanMat.emissiveIntensity = 1.6;

      for (const pl of this.cityLights) {
        pl.intensity = pl.userData.nightIntensity;
      }

      for (const m of this.glowMaterials) {
        const base = m.userData.baseIntensity ?? 0.5;
        m.emissiveIntensity = base * 1.45;
      }
    } else {
      this.scene.background = new THREE.Color(0xF2EFE7); // 暖纸晨光
      this.scene.fog = new THREE.FogExp2(0xF2EFE7, 0.0032);

      this.ambientLight.color.setHex(0xFFFBF2);
      this.ambientLight.groundColor.setHex(0x4A5552);
      this.ambientLight.intensity = 0.98;

      this.sunLight.color.setHex(0xFFF3DC);
      this.sunLight.intensity = 1.38;

      this.fillLight.color.setHex(0x76BFAE);
      this.fillLight.intensity = 0.38;

      this.islandLandMat.color.setHex(0xE8E2D5);
      this.islandLandMat.emissiveIntensity = 0.12;
      this.islandCliffMat.color.setHex(0xC9C2B2);
      this.roadMat.color.setHex(0xD2CBBF);
      this.roadMat.emissiveIntensity = 0.08;
      this.wallCeramicMat.color.setHex(0xF5F2EB);
      this.exoFrameMat.color.setHex(0xDED9CE);
      this.waterSurfaceMat.color.setHex(0x21675C);

      // 白天完全关闭窗户自发光，恢复纯净象牙白瓷墙体！
      this.facadeWarmMat.color.setHex(0xF5F2EB);
      this.facadeCyanMat.color.setHex(0xF5F2EB);
      this.facadeCoreMat.color.setHex(0xEDE8DF);
      this.facadeWarmMat.emissiveIntensity = 0.0;
      this.facadeCyanMat.emissiveIntensity = 0.0;
      this.facadeCoreMat.emissiveIntensity = 0.0;
      this.windowWarmMat.emissiveIntensity = 0.05;
      this.windowCyanMat.emissiveIntensity = 0.05;

      for (const pl of this.cityLights) {
        pl.intensity = pl.userData.nightIntensity * 0.15;
      }

      for (const m of this.glowMaterials) {
        const base = m.userData.baseIntensity ?? 0.25;
        m.emissiveIntensity = base * 0.55;
      }
    }
  }
}

// ============================================================================
// 几何体辅助：更凌厉的精密工业切角挤压体 (减小圆角半径，告别肥厚乐高感)
// ============================================================================
export function createRoundedBoxGeometry(width, height, depth, radius = 0.18, curveSegments = 3) {
  const shape = new THREE.Shape();
  const hw = width / 2;
  const hd = depth / 2;
  const r = Math.min(radius, hw * 0.32, hd * 0.32);

  shape.moveTo(-hw + r, -hd);
  shape.lineTo(hw - r, -hd);
  shape.quadraticCurveTo(hw, -hd, hw, -hd + r);
  shape.lineTo(hw, hd - r);
  shape.quadraticCurveTo(hw, hd, hw - r, hd);
  shape.lineTo(-hw + r, hd);
  shape.quadraticCurveTo(-hw, hd, -hw, hd - r);
  shape.lineTo(-hw, -hd + r);
  shape.quadraticCurveTo(-hw, -hd, -hw + r, -hd);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: true,
    bevelSegments: 1,
    steps: 1,
    bevelSize: Math.min(0.06, r * 0.25),
    bevelThickness: Math.min(0.06, r * 0.25),
    curveSegments,
  });

  geo.rotateX(-Math.PI / 2);
  geo.computeBoundingBox();
  const minY = geo.boundingBox.min.y;
  geo.translate(0, -minY, 0);
  geo.computeVertexNormals();
  return geo;
}