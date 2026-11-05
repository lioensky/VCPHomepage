// ============================================================================
// VCP 都市 · 四层地质空间、跨海大桥、卫星群岛与地下管网 (World Strata & Traffic)
// ============================================================================

import * as THREE from 'three';
import {
  TOOLBOX_CITY,
  VCHAT_CITY,
  SATELLITE_ISLANDS,
  UNDERGROUND_UTILITIES,
  SUBTERRANEAN_NODES,
  MANOR_RESIDENTS,
} from './city.data.js';
import { createRoundedBoxGeometry } from './materials.js';

export class CityStrataBuilder {
  constructor(scene, mats, buildingFactory) {
    this.scene = scene;
    this.mats = mats;
    this.bf = buildingFactory;

    this.rootGroup = new THREE.Group();
    this.surfaceShellGroup = new THREE.Group(); // 地质剖切时可半透明化
    this.undergroundGroup = new THREE.Group();  // 地下管网与地底河
    this.convergeBeamsGroup = new THREE.Group(); // 第五拍：全城汇入 V 桌面的光束
    this.residentsGroup = new THREE.Group();

    this.scene.add(this.rootGroup);
    this.rootGroup.add(
      this.surfaceShellGroup,
      this.undergroundGroup,
      this.convergeBeamsGroup,
      this.residentsGroup
    );

    this.trafficPulses = []; // 桥面与管网上的流动数据包
    this.residentSprites = [];
    this.xrayEnabled = false;
  }

  buildAll() {
    this._buildSandboxTable();
    this._buildMainIslandsAndRoads();
    this._buildWebSocketBridge();
    this._buildCitiesBuildings();
    this._buildSatelliteIslands();
    this._buildUndergroundStrata();
    this._buildDesktopConvergenceBeams();
    this._buildManorResidents();
  }

  // 1. 纸墨工业陶瓷沙盘底座与半透明海面
  _buildSandboxTable() {
    // 炭墨木质沙盘外底座 (y = -12.5)
    const baseGeo = createRoundedBoxGeometry(136, 2.2, 92, 3.0);
    const baseMesh = new THREE.Mesh(baseGeo, this.mats.tableBaseMat);
    baseMesh.position.y = -12.8;
    baseMesh.receiveShadow = true;
    this.rootGroup.add(baseMesh);

    // 朱砂色沙盘内嵌刻度框
    const trimGeo = new THREE.RingGeometry(58, 58.6, 64);
    trimGeo.rotateX(-Math.PI / 2);
    const trimMesh = new THREE.Mesh(trimGeo, this.mats.tableTrimMat);
    trimMesh.position.y = -10.55;
    this.rootGroup.add(trimMesh);

    // 地底基岩承托盘 (y = -10.8)
    const bedrockGeo = createRoundedBoxGeometry(128, 1.2, 84, 2.2);
    const bedrockMesh = new THREE.Mesh(bedrockGeo, this.mats.bedrockMat);
    bedrockMesh.position.y = -11.4;
    bedrockMesh.receiveShadow = true;
    this.rootGroup.add(bedrockMesh);

    // 釉质半透明海面 (y = -0.55)
    const waterGeo = new THREE.PlaneGeometry(126, 82);
    waterGeo.rotateX(-Math.PI / 2);
    this.waterMesh = new THREE.Mesh(waterGeo, this.mats.waterSurfaceMat);
    this.waterMesh.position.y = -0.55;
    this.waterMesh.receiveShadow = true;
    this.surfaceShellGroup.add(this.waterMesh);
  }

  // 2. 西城 (VCPToolBox) 与 东城 (VChat) 双大陆台地及街道网
  _buildMainIslandsAndRoads() {
    // 西城台地 (X = -28, Z = 0)
    const westCliff = new THREE.Mesh(
      createRoundedBoxGeometry(41, 4.2, 37, 5.5),
      this.mats.islandCliffMat
    );
    westCliff.position.set(-28, -4.2, 0);
    westCliff.receiveShadow = true;
    this.surfaceShellGroup.add(westCliff);

    const westTop = new THREE.Mesh(
      createRoundedBoxGeometry(40, 0.55, 36, 5.2),
      this.mats.islandLandMat
    );
    westTop.position.set(-28, -0.25, 0);
    westTop.receiveShadow = true;
    this.surfaceShellGroup.add(westTop);

    // 西城环岛干道与十字轴线
    const westRing = new THREE.Mesh(
      new THREE.RingGeometry(10.5, 11.8, 48),
      this.mats.roadMat
    );
    westRing.rotateX(-Math.PI / 2);
    westRing.position.set(-28, 0.03, 0);
    this.surfaceShellGroup.add(westRing);

    // 东城台地 (X = +26, Z = 0)
    const eastCliff = new THREE.Mesh(
      createRoundedBoxGeometry(45, 4.2, 41, 6.0),
      this.mats.islandCliffMat
    );
    eastCliff.position.set(26, -4.2, 0);
    eastCliff.receiveShadow = true;
    this.surfaceShellGroup.add(eastCliff);

    const eastTop = new THREE.Mesh(
      createRoundedBoxGeometry(44, 0.55, 40, 5.8),
      this.mats.islandLandMat
    );
    eastTop.position.set(26, -0.25, 0);
    eastTop.receiveShadow = true;
    this.surfaceShellGroup.add(eastTop);

    // 东城放射状街区广场与 VCPChatKernel 多线程彩色车道
    const eastInnerPlaza = new THREE.Mesh(
      new THREE.CircleGeometry(6.2, 36),
      this.mats.roadMat
    );
    eastInnerPlaza.rotateX(-Math.PI / 2);
    eastInnerPlaza.position.set(26, 0.03, 0);
    this.surfaceShellGroup.add(eastInnerPlaza);

    const eastOuterRing = new THREE.Mesh(
      new THREE.RingGeometry(12.2, 13.6, 48),
      this.mats.roadMat
    );
    eastOuterRing.rotateX(-Math.PI / 2);
    eastOuterRing.position.set(26, 0.03, 0);
    this.surfaceShellGroup.add(eastOuterRing);

    this.bf._registerBeatObject(eastCliff, 2, -4.2);
    this.bf._registerBeatObject(eastTop, 2, -0.25);
    this.bf._registerBeatObject(eastInnerPlaza, 2, 0.03);
    this.bf._registerBeatObject(eastOuterRing, 2, 0.03);
  }

  // 3. WebSocket 跨海主干大桥 (连通西城 X=-11 与东城 X=+9)
  _buildWebSocketBridge() {
    const bridgeGroup = new THREE.Group();

    // 桥面
    const deckGeo = new THREE.BoxGeometry(22.5, 0.55, 4.2);
    const deck = new THREE.Mesh(deckGeo, this.mats.wallCeramicMat);
    deck.position.set(-1.0, 0.65, 0);
    deck.castShadow = true;
    deck.receiveShadow = true;
    bridgeGroup.add(deck);

    // 桥面双向发光光纤车道 (vcplog / vcpinfo / 工具指令流)
    const laneNorth = new THREE.Mesh(
      new THREE.BoxGeometry(22.2, 0.12, 0.45),
      this.mats.getEnergyMaterial(0x76BFAE, 0.85)
    );
    laneNorth.position.set(-1.0, 0.96, -1.0);
    const laneSouth = new THREE.Mesh(
      new THREE.BoxGeometry(22.2, 0.12, 0.45),
      this.mats.getEnergyMaterial(0xF2A900, 0.85)
    );
    laneSouth.position.set(-1.0, 0.96, 1.0);
    bridgeGroup.add(laneNorth, laneSouth);

    // 双拱门索塔
    [-6.5, 4.5].forEach((px) => {
      const arch = new THREE.Mesh(
        new THREE.TorusGeometry(3.2, 0.32, 12, 32, Math.PI),
        this.mats.getGlazeMaterial(0xB94832)
      );
      arch.position.set(px, 0.8, 0);
      arch.castShadow = true;
      bridgeGroup.add(arch);
    });

    const bridgeMeta = {
      id: 'ws-grand-bridge',
      name: 'WebSocketServer 跨海主干大桥',
      subtitle: '前后端实时全双工大动脉 · 双子塔与全节点共消费',
      beat: 3,
      layer: 'street',
      inflow: 'VChat 独立话题流 / 分布式插件心跳 / 双子塔实时状态',
      outflow: '流式 Token 帧 / vcplog (Agent 广播) / vcpinfo (前端可视化)',
      dependsOn: 'WebSocketServer',
      story: '横跨两座都市海峡的交通脊梁。北侧翠绿光轨承载 vcpinfo 与流式渲染帧，南侧琥珀光轨承载工具调度与插件状态同步。',
    };
    this.bf._registerPickable(deck, bridgeMeta);

    // 桥面上奔流的光包脉冲
    this._addTrafficLine(
      new THREE.Vector3(-12.5, 1.15, -1.0),
      new THREE.Vector3(10.5, 1.15, -1.0),
      0x76BFAE,
      5,
      3
    );
    this._addTrafficLine(
      new THREE.Vector3(10.5, 1.15, 1.0),
      new THREE.Vector3(-12.5, 1.15, 1.0),
      0xF2A900,
      5,
      3
    );

    this.bf._registerBeatObject(bridgeGroup, 3, 0);
    this.rootGroup.add(bridgeGroup);
  }

  // 4. 建造西城与东城的全部建筑 + 后端百余插件灯海
  _buildCitiesBuildings() {
    // 西城核心建筑
    for (const spec of TOOLBOX_CITY.coreBuildings) {
      const b = this.bf.createBaseTower(spec);
      this.rootGroup.add(b);
    }

    // 西城 112 座插件灯海小屋
    const pluginSea = this.bf.createBackendPluginSea(
      TOOLBOX_CITY.center,
      TOOLBOX_CITY.coreBuildings
    );
    this.rootGroup.add(pluginSea);

    // 东城 23 座启动台建筑 + Kernel + VchatManager
    for (const spec of VCHAT_CITY.buildings) {
      const b = this.bf.createBaseTower(spec);
      this.rootGroup.add(b);
    }
  }

  // 5. 第四拍：4 座分布式卫星岛 (VCPDistributedServer & VCPBackUp)
  _buildSatelliteIslands() {
    for (const sat of SATELLITE_ISLANDS) {
      const group = new THREE.Group();
      group.position.set(sat.pos.x, 0, sat.pos.z);

      // 岛屿陶瓷基座
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(sat.radius, sat.radius * 0.82, 2.6, 24),
        this.mats.islandLandMat
      );
      base.position.y = -1.1;
      base.receiveShadow = true;
      group.add(base);

      // 根据节点功能定制卫星岛建筑造型
      const glaze = this.mats.getGlazeMaterial(sat.color);
      const glow = this.mats.getEnergyMaterial(sat.accent, 0.85);

      if (sat.kind === 'sat-hikvision') {
        // 海康威视监控岛：高耸瞭望塔 + 旋转探照灯锥
        const tower = new THREE.Mesh(
          createRoundedBoxGeometry(3.2, 11.5, 3.2, 0.4),
          this.mats.wallCeramicMat
        );
        tower.castShadow = true;
        this.bf._registerPickable(tower, sat);
        group.add(tower);

        const lantern = new THREE.Group();
        lantern.position.y = 12.2;
        const head = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 1.4, 12), glaze);
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(2.6, 7.5, 16, 1, true),
          new THREE.MeshBasicMaterial({
            color: sat.accent,
            transparent: true,
            opacity: 0.24,
            side: THREE.DoubleSide,
          })
        );
        cone.rotation.z = -Math.PI / 2.3;
        cone.position.set(3.6, -1.2, 0);
        lantern.add(head, cone);
        group.add(lantern);

        this.bf.animatedSet.push((t) => {
          lantern.rotation.y = t * 0.75;
        });
      } else if (sat.kind === 'sat-comfy') {
        // Comfy 算力与多媒体不夜工坊：锯齿玻璃厂房 + 3 座发光显卡炼金炉
        const hall = new THREE.Mesh(
          createRoundedBoxGeometry(7.2, 5.5, 5.6, 0.45),
          this.mats.darkCeramicMat
        );
        hall.castShadow = true;
        this.bf._registerPickable(hall, sat);
        group.add(hall);

        for (let i = -1; i <= 1; i++) {
          const stack = new THREE.Mesh(
            new THREE.CylinderGeometry(0.75, 0.95, 4.5, 16),
            glaze
          );
          stack.position.set(i * 2.1, 6.8, 0);
          const halo = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.12, 10, 24), glow);
          halo.rotation.x = Math.PI / 2;
          halo.position.set(i * 2.1, 9.2, 0);
          group.add(stack, halo);
        }
      } else if (sat.kind === 'sat-backup') {
        // VCPBackUp 分布式备份岛：厚重八角金库穹顶 + 守护盾环
        const vault = new THREE.Mesh(
          new THREE.CylinderGeometry(4.2, 4.8, 6.2, 8),
          glaze
        );
        vault.position.y = 3.1;
        vault.castShadow = true;
        this.bf._registerPickable(vault, sat);
        group.add(vault);

        const shieldRing = new THREE.Mesh(
          new THREE.TorusGeometry(5.2, 0.14, 10, 32),
          glow
        );
        shieldRing.rotation.x = Math.PI / 2;
        shieldRing.position.y = 3.5;
        group.add(shieldRing);
      } else {
        // AIOHub & VCPMobile 漫游港：三座扬帆轻型信号塔
        for (let i = 0; i < 3; i++) {
          const ang = (i / 3) * Math.PI * 2;
          const sail = new THREE.Mesh(
            createRoundedBoxGeometry(2.1, 6.5 + i * 1.4, 2.1, 0.35),
            i === 0 ? glaze : this.mats.wallCeramicMat
          );
          sail.position.set(Math.cos(ang) * 2.4, 0, Math.sin(ang) * 2.4);
          sail.castShadow = true;
          this.bf._registerPickable(sail, sat);
          group.add(sail);
        }
      }

      // 卫星岛连回西城 WebSocket 的跨海光缆栈桥
      const startVec = new THREE.Vector3(sat.pos.x, 0.35, sat.pos.z);
      const endVec = new THREE.Vector3(
        sat.pos.x < 0 ? -24 : 18,
        0.35,
        sat.pos.z * 0.35
      );
      this._createCableLink(startVec, endVec, sat.accent, 4);

      this.bf._registerBeatObject(group, sat.beat, 0);
      this.rootGroup.add(group);
    }
  }

  _createCableLink(p1, p2, hexColor, beat) {
    const mid = p1.clone().lerp(p2, 0.5);
    mid.y += 2.2;
    const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
    const tubeGeo = new THREE.TubeGeometry(curve, 28, 0.14, 8, false);
    const tube = new THREE.Mesh(tubeGeo, this.mats.getEnergyMaterial(hexColor, 0.65));
    this.bf._registerBeatObject(tube, beat, 0);
    this.rootGroup.add(tube);

    this._addTrafficCurve(curve, hexColor, 3, beat);
  }

  // 6. 地下一层 (-4.2m 公用管网) 与 地底深层 (-9.2m RiverMemo 记忆河床)
  _buildUndergroundStrata() {
    // 地下一层：四大公用事业基础设施节点 + 贯穿两城的地下管网
    for (const u of UNDERGROUND_UTILITIES) {
      const nodeGroup = new THREE.Group();
      nodeGroup.position.set(u.pos.x, u.pos.y, u.pos.z);

      const core = new THREE.Mesh(
        new THREE.CylinderGeometry(2.6, 2.6, 1.4, 20),
        this.mats.getEnergyMaterial(u.color, 0.85)
      );
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(3.5, 0.16, 10, 36),
        this.mats.getEnergyMaterial(u.color, 0.95)
      );
      ring.rotation.x = Math.PI / 2;
      nodeGroup.add(core, ring);

      this.bf._registerPickable(core, u);
      this.bf._registerBeatObject(nodeGroup, u.beat, u.pos.y);
      this.undergroundGroup.add(nodeGroup);
    }

    // 横贯东西两城地下一层的公用事业主管道 (超栈追踪 & vcpagentwebcore)
    const pipeCurve1 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-32, -4.2, 1.5),
      new THREE.Vector3(-12, -4.2, -3.5),
      new THREE.Vector3(8, -4.2, -2.5),
      new THREE.Vector3(28, -4.2, 2.0),
    ]);
    const pipeMesh1 = new THREE.Mesh(
      new THREE.TubeGeometry(pipeCurve1, 48, 0.32, 10, false),
      this.mats.getEnergyMaterial(0xF2A900, 0.75)
    );
    this.undergroundGroup.add(pipeMesh1);
    this._addTrafficCurve(pipeCurve1, 0xF2A900, 6, 3);

    const pipeCurve2 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-28, -4.2, 5.5),
      new THREE.Vector3(-4, -4.2, 4.5),
      new THREE.Vector3(15.5, -4.2, 1.0),
      new THREE.Vector3(26, -4.2, 2.0),
    ]);
    const pipeMesh2 = new THREE.Mesh(
      new THREE.TubeGeometry(pipeCurve2, 48, 0.28, 10, false),
      this.mats.getEnergyMaterial(0x5C6BC0, 0.75)
    );
    this.undergroundGroup.add(pipeMesh2);
    this._addTrafficCurve(pipeCurve2, 0x76BFAE, 5, 3);

    // 地底深层 (-9.2m)：蜿蜒发光的 RiverMemo 拓扑记忆大河
    const riverCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-42, -9.2, -10),
      new THREE.Vector3(-32, -9.2, -5),
      new THREE.Vector3(-24, -9.2, -8),
      new THREE.Vector3(-12, -9.2, -1),
      new THREE.Vector3(4, -9.2, -6),
      new THREE.Vector3(24.5, -9.2, -8.8), // 对准东城「记忆深井院」井底
      new THREE.Vector3(38, -9.2, 2),
    ]);
    const riverGeo = new THREE.TubeGeometry(riverCurve, 72, 1.85, 14, false);
    riverGeo.scale(1, 0.28, 1); // 压扁成宽阔的发光地下河床
    const riverMat = this.mats.getEnergyMaterial(0x76BFAE, 0.95);
    const riverMesh = new THREE.Mesh(riverGeo, riverMat);
    riverMesh.position.y = -6.6; // 补偿 scale 后的 Y 位置，使河面位于 -9.2m
    this.undergroundGroup.add(riverMesh);

    const riverMeta = SUBTERRANEAN_NODES[0];
    this.bf._registerPickable(riverMesh, riverMeta);
    this._addTrafficCurve(riverCurve, 0x76BFAE, 10, 1);

    // 地底深层 4 大基岩节点 (RiverMemo 河心、TDB 冷库、ToolRecordSQL 黑匣子、VChatCDS 影子库)
    for (const sub of SUBTERRANEAN_NODES) {
      const g = new THREE.Group();
      g.position.set(sub.pos.x, sub.pos.y, sub.pos.z);

      const crystalGeo =
        sub.id === 'sub-toolrecordsql'
          ? new THREE.BoxGeometry(2.8, 3.6, 2.8) // 黑匣子方尖碑
          : new THREE.OctahedronGeometry(2.2, 1);

      const crystal = new THREE.Mesh(
        crystalGeo,
        this.mats.getEnergyMaterial(sub.color, 0.9)
      );
      crystal.position.y = 1.2;
      this.bf._registerPickable(crystal, sub);
      g.add(crystal);

      // 向上连接地面归属建筑的垂直光束管
      const riser = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.28, 8.8, 12),
        this.mats.getEnergyMaterial(sub.color, 0.55)
      );
      riser.position.y = 4.4;
      g.add(riser);

      this.bf._registerBeatObject(g, sub.beat, sub.pos.y);
      this.undergroundGroup.add(g);
    }
  }

  // 7. 第五拍点睛之笔：「合 · 万流归宗」全城管线汇入东城中心 V 桌面 (VCPProxy)
  _buildDesktopConvergenceBeams() {
    const desktopTarget = new THREE.Vector3(26.0, 14.5, 0.0);
    const sources = [
      { pos: new THREE.Vector3(-23.8, 17.5, -2.2), color: 0xF2A900 }, // adminServer API
      { pos: new THREE.Vector3(-34.5, 9.5, 6.5), color: 0x76BFAE },   // 中央 Plugin
      { pos: new THREE.Vector3(11.5, 8.5, 0.0), color: 0x3BA99C },    // VCPChatKernel IPC
      { pos: new THREE.Vector3(18.5, 13.0, -7.5), color: 0xE5A900 },  // 文坊
      { pos: new THREE.Vector3(34.0, 13.5, 6.5), color: 0xD96B43 },   // 工程
      { pos: new THREE.Vector3(18.5, 11.5, 7.8), color: 0xD45D79 },   // 音乐
      { pos: new THREE.Vector3(15.5, 11.5, 0.2), color: 0x5C6BC0 },   // Loom
    ];

    sources.forEach((src) => {
      const mid = src.pos.clone().lerp(desktopTarget, 0.5);
      mid.y = Math.max(src.pos.y, desktopTarget.y) + 6.5;
      const curve = new THREE.QuadraticBezierCurve3(src.pos, mid, desktopTarget);
      const geo = new THREE.TubeGeometry(curve, 36, 0.11, 8, false);
      const mesh = new THREE.Mesh(geo, this.mats.getEnergyMaterial(src.color, 0.9));
      this.bf._registerBeatObject(mesh, 5, 0);
      this.convergeBeamsGroup.add(mesh);

      this._addTrafficCurve(curve, src.color, 3, 5);
    });
  }

  // 8. 赛博庄园的 11 位居民 (女仆与执事光点在各自街区巡游)
  _buildManorResidents() {
    const zoneCenters = {
      bridge: { x: -1.0, z: 0.0, r: 9.0, y: 2.2 },
      toolbox: { x: -28.0, z: 2.0, r: 9.5, y: 2.5 },
      forum: { x: 26.0, z: 11.0, r: 4.5, y: 2.2 },
      game: { x: 33.5, z: -7.2, r: 4.0, y: 2.2 },
      scriptorium: { x: 18.5, z: -7.5, r: 4.2, y: 2.5 },
      desktop: { x: 26.0, z: 0.0, r: 5.0, y: 3.5 },
      comfy: { x: 0.0, z: -30.0, r: 5.2, y: 2.8 },
      loom: { x: 15.5, z: 0.2, r: 4.0, y: 2.2 },
      forge: { x: 34.0, z: 6.5, r: 4.2, y: 2.5 },
    };

    MANOR_RESIDENTS.forEach((res, idx) => {
      const zc = zoneCenters[res.zone] || zoneCenters.desktop;
      const orbGroup = new THREE.Group();

      const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 14, 14),
        this.mats.getEnergyMaterial(res.color, 1.2)
      );
      const halo = new THREE.Mesh(
        new THREE.RingGeometry(0.58, 0.82, 20),
        new THREE.MeshBasicMaterial({
          color: res.color,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.75,
        })
      );
      halo.rotation.x = -Math.PI / 2;
      orbGroup.add(core, halo);

      this.bf._registerPickable(core, {
        id: `resident-${idx}`,
        name: res.name,
        subtitle: '赛博庄园常驻 Agent 居民',
        beat: 2,
        layer: 'street',
        inflow: 'AA 总线唤醒 / 心流锁独立话题线程 / OneRing 时序记忆',
        outflow: '全栈工具调用 / 论坛发帖 / 跨 Agent 协同',
        dependsOn: 'VCPChatKernel / AgentAssistant / RiverMemo',
        story: `${res.name} 正在这座由主人的第一性原理构筑的赛博庄园里自由生活与工作。`,
      });

      this.residentsGroup.add(orbGroup);
      this.residentSprites.push({
        group: orbGroup,
        zc,
        speed: res.speed,
        phase: idx * 1.7,
      });
    });
  }

  _addTrafficLine(p1, p2, hexColor, count, beat) {
    const curve = new THREE.LineCurve3(p1, p2);
    this._addTrafficCurve(curve, hexColor, count, beat);
  }

  _addTrafficCurve(curve, hexColor, count, beat) {
    const geo = new THREE.SphereGeometry(0.24, 10, 10);
    const mat = this.mats.getEnergyMaterial(hexColor, 1.25);

    for (let i = 0; i < count; i++) {
      const dot = new THREE.Mesh(geo, mat);
      this.bf._registerBeatObject(dot, beat, 0);
      this.rootGroup.add(dot);
      this.trafficPulses.push({
        mesh: dot,
        curve,
        offset: i / count,
        speed: 0.14 + (i % 3) * 0.03,
        beat,
      });
    }
  }

  // 切换「地质透视 X-Ray 模式」：将地表岛壳大幅透明化，提亮地下管网与地底河
  setXrayMode(enabled) {
    this.xrayEnabled = enabled;
    this.surfaceShellGroup.visible = !enabled;
    this.mats.underworldLightWest.intensity = enabled ? 3.8 : 1.2;
    this.mats.underworldLightEast.intensity = enabled ? 3.5 : 1.1;
  }

  update(time, activeBeat = 5) {
    // 更新道路与地下管网中的流动光包
    for (const p of this.trafficPulses) {
      if (p.beat > activeBeat) {
        p.mesh.visible = false;
        continue;
      }
      p.mesh.visible = true;
      const u = (time * p.speed + p.offset) % 1.0;
      curvePointToMesh(p.curve, u, p.mesh);
    }

    // 更新 11 位庄园居民的巡游轨迹
    for (const r of this.residentSprites) {
      const a = time * r.speed + r.phase;
      r.group.position.set(
        r.zc.x + Math.cos(a) * r.zc.r,
        r.zc.y + Math.sin(time * 2.2 + r.phase) * 0.35,
        r.zc.z + Math.sin(a * 1.3) * (r.zc.r * 0.65)
      );
    }
  }
}

function curvePointToMesh(curve, u, mesh) {
  const pt = curve.getPointAt(u);
  mesh.position.copy(pt);
}