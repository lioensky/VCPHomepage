// ============================================================================
// VCP 都市 · 赛博精密建筑与地标雕刻器 (Cyber-Industrial Architecture Builder)
// 告别乐高感的核心技法：
//   1. 内核发光幕墙体 + 外部四角装甲立柱 (Corner Exoskeleton Pillars)
//   2. 多级阶梯退台 (Stepped Setback Tiers) 与水平霓虹腰线环 (Neon Waist Rings)
//   3. 竖向贯穿导光槽 (Vertical Light Strips) + 屋顶冷却矩阵与全息激光信标
// ============================================================================

import * as THREE from 'three';
import { createRoundedBoxGeometry } from './materials.js';

export class BuildingFactory {
  constructor(mats) {
    this.mats = mats;
    this.animatedSet = [];
    this.pickableMeshes = [];
    this.beatGroups = new Map();
  }

  _registerBeatObject(obj, beat = 1, baseY = 0) {
    obj.userData.beat = beat;
    obj.userData.baseY = baseY;
    obj.userData.growProgress = 1;
    if (!this.beatGroups.has(beat)) {
      this.beatGroups.set(beat, []);
    }
    this.beatGroups.get(beat).push(obj);
  }

  _registerPickable(mesh, meta) {
    mesh.userData.cityMeta = meta;
    this.pickableMeshes.push(mesh);
  }

  // 创建精密赛博摩天楼：底座裙房 + 发光玻璃幕墙核 + 四角外骨骼装甲柱 + 阶梯退台 + 霓虹腰线
  createBaseTower(spec) {
    const group = new THREE.Group();
    group.position.set(spec.pos.x, spec.pos.y ?? 0, spec.pos.z);

    const { w, d, h } = spec.size;
    const roofColor = spec.color || 0x3BA99C;
    const accentColor = spec.accent || 0xF2A900;

    const glowRoof = this.mats.getEnergyMaterial(roofColor, 1.35);
    const glowAccent = this.mats.getEnergyMaterial(accentColor, 1.45);
    const glazeRoof = this.mats.getGlazeMaterial(roofColor, { roughness: 0.22, metalness: 0.5 });

    // VchatManager 保持刻意质朴的粗野主义混凝土地堡
    if (spec.kind === 'bunker-manager') {
      return this._createBunkerBuilding(group, spec, w, h, d, glowAccent);
    }

    // 1. 双层精密工业裙房基座 + 底部地面霓虹导光圈
    const podiumGeo = createRoundedBoxGeometry(w + 0.65, 0.85, d + 0.65, 0.16);
    const podium = new THREE.Mesh(podiumGeo, this.mats.darkCeramicMat);
    podium.castShadow = true;
    podium.receiveShadow = true;
    group.add(podium);

    const groundNeon = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.78, 0.12, d + 0.78),
      glowRoof
    );
    groundNeon.position.y = 0.12;
    group.add(groundNeon);

    // 2. 主塔楼发光玻璃幕墙核心 (带千家万户/服务器机柜发光纹理)
    const facadeMat =
      spec.layer === 'street'
        ? this.mats.facadeCoreMat
        : spec.landmark
        ? this.mats.facadeCyanMat
        : this.mats.facadeWarmMat;

    const tier1H = h * 0.68;
    const coreGeo = new THREE.BoxGeometry(w * 0.88, tier1H, d * 0.88);
    const coreMesh = new THREE.Mesh(coreGeo, facadeMat);
    coreMesh.position.y = 0.85 + tier1H / 2;
    coreMesh.castShadow = true;
    coreMesh.receiveShadow = true;
    this._registerPickable(coreMesh, spec);
    group.add(coreMesh);

    // 3. 四角装甲外骨骼立柱 (Corner Exoskeleton Fins) —— 彻底打破方盒单调感
    const pillarW = Math.max(0.28, w * 0.14);
    const pillarD = Math.max(0.28, d * 0.14);
    const pillarGeo = new THREE.BoxGeometry(pillarW, tier1H + 0.4, pillarD);
    const frameMat = spec.landmark ? this.mats.wallCeramicMat : this.mats.exoFrameMat;

    const corners = [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ];
    for (const [cx, cz] of corners) {
      const pillar = new THREE.Mesh(pillarGeo, frameMat);
      pillar.position.set(
        cx * (w * 0.44),
        0.85 + tier1H / 2,
        cz * (d * 0.44)
      );
      pillar.castShadow = true;
      group.add(pillar);
    }

    // 4. 立面中央竖向霓虹导光脊 (Vertical Cyber Fin)
    const vStripGeo = new THREE.BoxGeometry(0.14, tier1H * 0.92, d * 0.94);
    const vStrip = new THREE.Mesh(vStripGeo, glowRoof);
    vStrip.position.y = 0.85 + tier1H * 0.5;
    group.add(vStrip);

    // 5. 二阶退台塔身 (Upper Setback Tier) + 发光中腰环
    const waistY = 0.85 + tier1H;
    const waistTrim = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.22, 0.22, d + 0.22),
      glowAccent
    );
    waistTrim.position.y = waistY;
    group.add(waistTrim);

    const tier2H = h * 0.28;
    const tier2W = w * 0.72;
    const tier2D = d * 0.72;
    const tier2Mesh = new THREE.Mesh(
      new THREE.BoxGeometry(tier2W, tier2H, tier2D),
      facadeMat
    );
    tier2Mesh.position.y = waistY + tier2H / 2;
    tier2Mesh.castShadow = true;
    this._registerPickable(tier2Mesh, spec);
    group.add(tier2Mesh);

    // 6. 顶冠装甲盖板 + 霓虹天际线框 + 赛博通讯天线/冷却模组
    const topY = waistY + tier2H;
    const crownCap = new THREE.Mesh(
      createRoundedBoxGeometry(tier2W + 0.35, 0.45, tier2D + 0.35, 0.12),
      glazeRoof
    );
    crownCap.position.y = topY;
    this._registerPickable(crownCap, spec);
    group.add(crownCap);

    const crownNeon = new THREE.Mesh(
      new THREE.BoxGeometry(tier2W + 0.42, 0.14, tier2D + 0.42),
      glowRoof
    );
    crownNeon.position.y = topY + 0.46;
    group.add(crownNeon);

    // 普通街区建筑顶部加装错落天线与全息小光标，地标建筑则装配专属大型动态雕塑
    if (!spec.kind) {
      const hvac = new THREE.Mesh(
        new THREE.BoxGeometry(tier2W * 0.45, 0.65, tier2D * 0.45),
        this.mats.darkCeramicMat
      );
      hvac.position.set(-tier2W * 0.15, topY + 0.75, 0);
      group.add(hvac);

      const antenna = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.08, 2.2, 6),
        glowAccent
      );
      antenna.position.set(tier2W * 0.22, topY + 1.5, tier2D * 0.18);
      group.add(antenna);
    } else {
      this._decorateSpecialKind(group, spec, w, topY + 0.55, d, roofColor, accentColor);
    }

    this._registerBeatObject(group, spec.beat || 1, spec.pos.y ?? 0);
    return group;
  }

  _createBunkerBuilding(group, spec, w, h, d, glowAccent) {
    const body = new THREE.Mesh(
      createRoundedBoxGeometry(w, h, d, 0.15),
      this.mats.darkCeramicMat
    );
    body.castShadow = true;
    this._registerPickable(body, spec);
    group.add(body);

    const cross1 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.28, 0.42), glowAccent);
    const cross2 = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.28, 1.5), glowAccent);
    cross1.position.y = h + 0.2;
    cross2.position.y = h + 0.2;
    group.add(cross1, cross2);

    this._registerBeatObject(group, spec.beat || 2, spec.pos.y ?? 0);
    return group;
  }

  // ============================================================================
  // 为核心内核与地标装配高辨识度赛博动态雕塑
  // ============================================================================
  _decorateSpecialKind(group, spec, w, topY, d, color, accent) {
    const glowColor = this.mats.getEnergyMaterial(color, 1.6);
    const glowAccent = this.mats.getEnergyMaterial(accent, 1.75);
    const glazeAccent = this.mats.getGlazeMaterial(accent, { roughness: 0.2, metalness: 0.6 });

    switch (spec.kind) {
      // 1. 西塔 server.js：赛博方尖碑天际主塔 + 双层反旋能量环 + 冲天主权光束
      case 'twin-west': {
        const tier3 = new THREE.Mesh(
          new THREE.BoxGeometry(w * 0.52, 4.5, d * 0.52),
          this.mats.facadeCoreMat
        );
        tier3.position.y = topY + 2.25;
        this._registerPickable(tier3, spec);
        group.add(tier3);

        const spire = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.48, 6.5, 8),
          glowAccent
        );
        spire.position.y = topY + 4.5 + 3.25;
        group.add(spire);

        // 直冲云霄的半透明天际激光柱
        const skyBeam = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18, 0.55, 22, 12, 1, true),
          new THREE.MeshBasicMaterial({
            color: accent,
            transparent: true,
            opacity: 0.28,
            side: THREE.DoubleSide,
          })
        );
        skyBeam.position.y = topY + 14;
        group.add(skyBeam);

        const ring1 = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.12, 12, 40), glowAccent);
        ring1.rotation.x = Math.PI / 2;
        ring1.position.y = topY + 4.2;

        const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.09, 10, 32), glowColor);
        ring2.rotation.x = Math.PI / 2;
        ring2.position.y = topY + 5.4;
        group.add(ring1, ring2);

        this.animatedSet.push((t) => {
          ring1.rotation.z = t * 0.9;
          ring2.rotation.z = -t * 1.4;
          ring1.position.y = topY + 4.2 + Math.sin(t * 2.2) * 0.3;
        });
        break;
      }

      // 2. 东塔 adminServer.js：全息棱镜监控核 + 与西塔相连的「双层发光共享内存天桥」
      case 'twin-east': {
        const crown = new THREE.Mesh(
          new THREE.BoxGeometry(w * 0.54, 3.4, d * 0.54),
          this.mats.facadeWarmMat
        );
        crown.position.y = topY + 1.7;
        this._registerPickable(crown, spec);
        group.add(crown);

        const holoOcta = new THREE.Mesh(new THREE.OctahedronGeometry(1.3, 0), glowAccent);
        holoOcta.position.y = topY + 5.2;
        const holoWire = new THREE.Mesh(
          new THREE.OctahedronGeometry(1.75, 0),
          new THREE.MeshBasicMaterial({ color: color, wireframe: true })
        );
        holoWire.position.y = topY + 5.2;
        group.add(holoOcta, holoWire);

        // 连接到西塔 server.js 的「共享内存 & API Post 赛博天桥」
        const bridgeY = topY * 0.62;
        const skybridge = new THREE.Mesh(
          new THREE.BoxGeometry(6.8, 0.75, 1.4),
          this.mats.darkCeramicMat
        );
        skybridge.position.set(-3.35, bridgeY, 0);
        group.add(skybridge);

        const laserRail1 = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.16, 0.18), glowAccent);
        laserRail1.position.set(-3.35, bridgeY + 0.45, 0.58);
        const laserRail2 = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.16, 0.18), glowColor);
        laserRail2.position.set(-3.35, bridgeY + 0.45, -0.58);
        group.add(laserRail1, laserRail2);

        this.animatedSet.push((t) => {
          holoOcta.rotation.y = t * 1.2;
          holoWire.rotation.y = -t * 0.8;
          holoWire.rotation.x = Math.sin(t * 1.5) * 0.4;
        });
        break;
      }

      // 3. Plugin 六相调度院：6 枚悬浮发光六棱晶体阵列
      case 'pipeline-plugin': {
        const hexGroup = new THREE.Group();
        hexGroup.position.y = topY + 1.9;
        group.add(hexGroup);

        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          const crystal = new THREE.Mesh(
            new THREE.CylinderGeometry(0.42, 0.42, 1.2, 6),
            i % 2 === 0 ? glowColor : glowAccent
          );
          crystal.position.set(Math.cos(angle) * 2.0, 0, Math.sin(angle) * 2.0);
          hexGroup.add(crystal);
        }
        this.animatedSet.push((t) => {
          hexGroup.rotation.y = t * 0.75;
          hexGroup.children.forEach((c, i) => {
            c.position.y = Math.sin(t * 2.5 + i) * 0.25;
          });
        });
        break;
      }

      // 4. AA 总线枢纽：五环赛博量子陀螺仪
      case 'aa-hub': {
        const gyro = new THREE.Group();
        gyro.position.y = topY + 2.2;
        group.add(gyro);

        const r1 = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.1, 10, 36), glowColor);
        const r2 = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.09, 10, 36), glowAccent);
        const core = new THREE.Mesh(new THREE.SphereGeometry(0.58, 16, 16), glowColor);
        gyro.add(r1, r2, core);

        this.animatedSet.push((t) => {
          r1.rotation.x = t * 1.3;
          r1.rotation.y = t * 0.8;
          r2.rotation.y = -t * 1.5;
          r2.rotation.z = t * 1.0;
        });
        break;
      }

      // 5. 地标 · 桌面 (VCPProxy 万流归宗)：悬浮全息曲面屏 + 双道能量汇聚光环
      case 'landmark-desktop': {
        const crown = new THREE.Group();
        crown.position.y = topY + 2.6;
        group.add(crown);

        const screenFrame = new THREE.Mesh(
          createRoundedBoxGeometry(4.0, 2.4, 0.26, 0.14),
          this.mats.darkCeramicMat
        );
        const screenFace = new THREE.Mesh(
          new THREE.PlaneGeometry(3.6, 2.0),
          glowColor
        );
        screenFace.position.z = 0.16;
        screenFrame.add(screenFace);

        for (let i = -1; i <= 1; i++) {
          const widget = new THREE.Mesh(
            new THREE.BoxGeometry(0.82, 0.58, 0.12),
            glowAccent
          );
          widget.position.set(i * 1.08, i === 0 ? 0.26 : -0.16, 0.24);
          screenFrame.add(widget);
        }
        crown.add(screenFrame);

        const proxyRing = new THREE.Mesh(
          new THREE.TorusGeometry(3.3, 0.13, 12, 48),
          glowAccent
        );
        proxyRing.rotation.x = Math.PI / 2;
        proxyRing.position.y = -1.2;
        crown.add(proxyRing);

        this.animatedSet.push((t) => {
          screenFrame.rotation.y = Math.sin(t * 0.7) * 0.38;
          screenFrame.position.y = Math.sin(t * 1.8) * 0.25;
          proxyRing.rotation.z = -t * 1.1;
        });
        break;
      }

      // 6. 地标 · 文坊 (Scriptorium V3)：全息羽毛笔尖 + 8 页发光悬浮流式稿纸环
      case 'landmark-scriptorium': {
        const quill = new THREE.Mesh(new THREE.ConeGeometry(0.85, 3.5, 6), glowAccent);
        quill.position.y = topY + 1.8;
        quill.rotation.z = -0.18;
        group.add(quill);

        const pagesGroup = new THREE.Group();
        pagesGroup.position.y = topY * 0.62;
        group.add(pagesGroup);

        const pageGeo = new THREE.BoxGeometry(0.95, 1.35, 0.05);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const page = new THREE.Mesh(pageGeo, glowColor);
          page.position.set(
            Math.cos(a) * (w * 0.74),
            (i % 3 - 1) * 1.3,
            Math.sin(a) * (d * 0.74)
          );
          page.lookAt(0, page.position.y, 0);
          pagesGroup.add(page);
        }

        this.animatedSet.push((t) => {
          pagesGroup.rotation.y = t * 0.65;
          pagesGroup.children.forEach((p, idx) => {
            p.position.y = Math.sin(t * 2.2 + idx) * 1.2;
          });
        });
        break;
      }

      // 7. 地标 · 工程 (ProjectForge)：重工激光塔吊 + 悬浮 MoonAST 发光积木
      case 'landmark-forge': {
        const crane = new THREE.Group();
        crane.position.y = topY;
        group.add(crane);

        const mast = new THREE.Mesh(new THREE.BoxGeometry(0.52, 4.0, 0.52), glazeAccent);
        mast.position.y = 2.0;
        crane.add(mast);

        const jibGroup = new THREE.Group();
        jibGroup.position.y = 3.8;
        crane.add(jibGroup);

        const jib = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.34, 0.38), glowColor);
        jib.position.x = 1.3;
        jibGroup.add(jib);

        const cable = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.05, 1.9),
          glowAccent
        );
        cable.position.set(3.0, -0.95, 0);
        jibGroup.add(cable);

        const astBlock = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.75, 0),
          glowAccent
        );
        astBlock.position.set(3.0, -2.0, 0);
        jibGroup.add(astBlock);

        this.animatedSet.push((t) => {
          jibGroup.rotation.y = Math.sin(t * 0.7) * 1.4;
          astBlock.position.y = -2.0 + Math.sin(t * 2.6) * 0.45;
          astBlock.rotation.y = t * 1.5;
        });
        break;
      }

      // 8. 地标 · 音乐 (VMusic)：赛博电音黑胶舞台 + 12 柱高频霓虹频谱
      case 'landmark-music': {
        const stage = new THREE.Group();
        stage.position.y = topY + 0.6;
        group.add(stage);

        const vinyl = new THREE.Mesh(
          new THREE.CylinderGeometry(1.95, 1.95, 0.18, 32),
          this.mats.darkCeramicMat
        );
        const label = new THREE.Mesh(
          new THREE.CylinderGeometry(0.78, 0.78, 0.24, 24),
          glowColor
        );
        vinyl.add(label);
        stage.add(vinyl);

        const bars = [];
        for (let i = 0; i < 12; i++) {
          const ang = (i / 12) * Math.PI * 2;
          const bar = new THREE.Mesh(
            new THREE.BoxGeometry(0.26, 1.0, 0.26),
            i % 2 === 0 ? glowAccent : glowColor
          );
          bar.position.set(Math.cos(ang) * 2.35, 0.5, Math.sin(ang) * 2.35);
          stage.add(bar);
          bars.push(bar);
        }

        this.animatedSet.push((t) => {
          vinyl.rotation.y = t * 2.0;
          bars.forEach((b, i) => {
            const s = 0.55 + Math.abs(Math.sin(t * 4.6 + i * 0.7)) * 2.1;
            b.scale.y = s;
            b.position.y = s * 0.5;
          });
        });
        break;
      }

      // 9. 地标 · Loom (语义织机)：双环全息拓扑织机
      case 'landmark-loom': {
        const loom = new THREE.Group();
        loom.position.y = topY + 2.2;
        group.add(loom);

        const ringOuter = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.13, 12, 36), glowColor);
        const ringInner = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.11, 12, 36), glowAccent);
        const nodeCenter = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 0), glowAccent);
        loom.add(ringOuter, ringInner, nodeCenter);

        this.animatedSet.push((t) => {
          ringOuter.rotation.y = t * 1.1;
          ringInner.rotation.x = t * 1.6;
          nodeCenter.rotation.z = -t * 1.3;
        });
        break;
      }

      // 10. 地标 · 记忆 (浪潮深井院)：紫晶量子轨道 + 贯穿地底 RiverMemo 的高能光柱井
      case 'landmark-memory': {
        const atom = new THREE.Group();
        atom.position.y = topY + 2.2;
        group.add(atom);

        for (let i = 0; i < 3; i++) {
          const orbit = new THREE.Mesh(
            new THREE.TorusGeometry(1.65, 0.09, 10, 36),
            i === 0 ? glowAccent : glowColor
          );
          orbit.rotation.x = (i * Math.PI) / 3;
          orbit.rotation.y = (i * Math.PI) / 4;
          atom.add(orbit);
        }
        const nucleus = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 16), glowAccent);
        atom.add(nucleus);

        const wellBeam = new THREE.Mesh(
          new THREE.CylinderGeometry(0.85, 1.25, 9.8, 20, 1, true),
          glowAccent
        );
        wellBeam.position.y = -4.8;
        group.add(wellBeam);

        this.animatedSet.push((t) => {
          atom.rotation.y = t * 1.25;
          atom.rotation.z = Math.sin(t * 0.9) * 0.35;
        });
        break;
      }

      // 11. 地标 · 主题 (NextUI 天象台)：七彩霓虹日晷
      case 'landmark-theme': {
        const flower = new THREE.Group();
        flower.position.y = topY + 2.0;
        group.add(flower);

        const petalColors = [0xFF5252, 0xFFB74D, 0x69F0AE, 0x26C6DA, 0x448AFF, 0xB388FF, 0xFF80AB];
        for (let i = 0; i < 7; i++) {
          const ang = (i / 7) * Math.PI * 2;
          const petal = new THREE.Mesh(
            new THREE.SphereGeometry(0.52, 14, 14),
            this.mats.getEnergyMaterial(petalColors[i], 1.5)
          );
          petal.scale.set(1.25, 0.42, 0.72);
          petal.position.set(Math.cos(ang) * 1.2, 0, Math.sin(ang) * 1.2);
          petal.rotation.y = -ang;
          this._registerPickable(petal, spec);
          flower.add(petal);
        }
        const sunCore = new THREE.Mesh(new THREE.SphereGeometry(0.65, 16, 16), glowAccent);
        this._registerPickable(sunCore, spec);
        flower.add(sunCore);

        this.animatedSet.push((t) => {
          flower.rotation.y = t * 0.85;
          flower.position.y = topY + 2.0 + Math.sin(t * 2.0) * 0.25;
        });
        break;
      }

      // 12. VCPChatKernel 中央消息总站：三股高速心流线程光环
      case 'kernel-hub': {
        const threads = new THREE.Group();
        threads.position.y = topY * 0.58;
        group.add(threads);

        const threadColors = [0x76BFAE, 0xF2A900, 0xFF4081];
        threadColors.forEach((tc, idx) => {
          const ring = new THREE.Mesh(
            new THREE.TorusGeometry(w * 0.82 + idx * 0.35, 0.11, 10, 36),
            this.mats.getEnergyMaterial(tc, 1.55)
          );
          ring.rotation.x = Math.PI / 2 + (idx - 1) * 0.3;
          threads.add(ring);
        });

        this.animatedSet.push((t) => {
          threads.children[0].rotation.z = t * 1.6;
          threads.children[1].rotation.z = -t * 1.3;
          threads.children[2].rotation.y = t * 1.2;
        });
        break;
      }

      default:
        break;
    }
  }

  // ============================================================================
  // 后端 112 座赛博服务器刀片舱灯海群 (带霓虹刃顶，彻底告别小土块感)
  // ============================================================================
  createBackendPluginSea(center = { x: -28, z: 0 }, CoreBuildings = []) {
    const group = new THREE.Group();
    const pods = [];

    let seed = 42;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    const pluginCategories = [
      { name: '同步插件群', color: 0x26C6DA },
      { name: '异步委托插件群', color: 0xFFB74D },
      { name: '静态提示词插件群', color: 0x42A5F5 },
      { name: '常驻服务插件群', color: 0xAB47BC },
      { name: '消息预处理插件群', color: 0xFF7043 },
      { name: '混合插件群', color: 0xEC407A },
    ];

    let attempts = 0;
    while (pods.length < 116 && attempts < 750) {
      attempts++;
      const angle = rand() * Math.PI * 2;
      const dist = 6.2 + Math.pow(rand(), 0.72) * 13.5;
      const x = center.x + Math.cos(angle) * dist;
      const z = center.z + Math.sin(angle) * dist;

      if (x > -16.2 && Math.abs(z) < 4.5) continue;
      let tooClose = false;
      for (const b of CoreBuildings) {
        const dx = x - b.pos.x;
        const dz = z - b.pos.z;
        const minDist = Math.max(b.size.w, b.size.d) * 0.72 + 1.3;
        if (dx * dx + dz * dz < minDist * minDist) {
          tooClose = true;
          break;
        }
      }
      if (!tooClose) {
        for (const h of pods) {
          const dx = x - h.x;
          const dz = z - h.z;
          if (dx * dx + dz * dz < 1.95) {
            tooClose = true;
            break;
          }
        }
      }
      if (tooClose) continue;

      const cat = pluginCategories[pods.length % pluginCategories.length];
      pods.push({
        x,
        z,
        w: 0.78 + rand() * 0.48,
        d: 0.78 + rand() * 0.48,
        h: 1.6 + rand() * 2.8, // 更高挑纤细的服务器微塔比例
        rotY: (Math.floor(rand() * 4) * Math.PI) / 2,
        cat,
      });
    }

    // 刀片服务器舱主体使用发光机柜纹理，顶部使用高辉度霓虹冠
    const bodyGeo = new THREE.BoxGeometry(1, 1, 1);
    bodyGeo.translate(0, 0.5, 0);
    const crownGeo = new THREE.BoxGeometry(1.06, 0.22, 1.06);
    crownGeo.translate(0, 0.11, 0);

    const podNeonMat = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      emissive: 0xFFB74D,
      emissiveIntensity: 1.35,
      roughness: 0.2,
      metalness: 0.3,
    });
    podNeonMat.userData.baseIntensity = 1.1;
    this.mats.glowMaterials.push(podNeonMat);

    const bodyInst = new THREE.InstancedMesh(bodyGeo, this.mats.wallCeramicMat, pods.length);
    const crownInst = new THREE.InstancedMesh(crownGeo, podNeonMat, pods.length);
    bodyInst.castShadow = true;
    bodyInst.receiveShadow = true;

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    pods.forEach((h, i) => {
      dummy.position.set(h.x, 0, h.z);
      dummy.rotation.set(0, h.rotY, 0);
      dummy.scale.set(h.w, h.h, h.d);
      dummy.updateMatrix();
      bodyInst.setMatrixAt(i, dummy.matrix);

      dummy.position.set(h.x, h.h, h.z);
      dummy.scale.set(h.w, 1, h.d);
      dummy.updateMatrix();
      crownInst.setMatrixAt(i, dummy.matrix);
      crownInst.setColorAt(i, color.setHex(h.cat.color));
    });

    bodyInst.instanceMatrix.needsUpdate = true;
    crownInst.instanceMatrix.needsUpdate = true;
    if (crownInst.instanceColor) crownInst.instanceColor.needsUpdate = true;

    const pluginMeta = {
      id: 'backend-plugin-sea',
      name: '后端百余插件刀片灯海 (116+ Plugin Pods)',
      subtitle: '6 大类别插件 · 数量本身就是造型',
      beat: 1,
      layer: 'skyline',
      inflow: 'Plugin 调度院统一生命周期管理 + 全局净化向量场',
      outflow: '文件/终端/联网/生图/邮件/IoT/审计 等百余项原子能力 → ToolRecordSQL',
      dependsOn: 'Plugin 管线 / 超栈追踪 / JevRuntime',
      story: '环绕双子塔星罗棋布的 116 座发光插件矩阵舱。它们共享同一个确定性上下文向量场，运行轨迹全部汇入地底的 ToolRecordSQL 黑匣子。',
    };

    this._registerPickable(bodyInst, pluginMeta);
    this._registerPickable(crownInst, pluginMeta);

    group.add(bodyInst, crownInst);
    this._registerBeatObject(group, 1, 0);
    return group;
  }

  update(time, dt, activeBeat = 5) {
    for (const fn of this.animatedSet) {
      fn(time, dt);
    }

    for (const [beat, objs] of this.beatGroups.entries()) {
      const target = beat <= activeBeat ? 1.0 : 0.001;
      for (const obj of objs) {
        const cur = obj.userData.growProgress ?? 1.0;
        const next = cur + (target - cur) * Math.min(1, dt * 6.5);
        obj.userData.growProgress = next;
        obj.scale.setScalar(Math.max(0.001, next));
        obj.visible = next > 0.015;
      }
    }
  }
}