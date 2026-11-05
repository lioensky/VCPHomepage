// ============================================================================
// VCP 都市 · 3D 陶瓷沙盘主控引擎 (Main Scene, Camera Rig, Raycaster & Tour)
// ============================================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import {
  GROWTH_BEATS,
  STRATA_LAYERS,
  TOOLBOX_CITY,
  VCHAT_CITY,
  SATELLITE_ISLANDS,
  UNDERGROUND_UTILITIES,
  SUBTERRANEAN_NODES,
  MESSAGE_JOURNEY_STOPS,
} from './city.data.js';
import { CeramicMaterialSystem } from './materials.js';
import { BuildingFactory } from './buildings.js';
import { CityStrataBuilder } from './layers.js';

class VCPMetropolisApp {
  constructor() {
    this.canvas = document.getElementById('city-canvas');
    this.labelsContainer = document.getElementById('floating-labels');

    this.activeBeat = 5; // 默认展示完整的「现在」(第五拍：万流归宗)
    this.isNight = false; // 默认暖纸晨光，夜景仍可手动切换
    this.isXray = false;
    this.selectedMeta = null;

    // 导览状态 (一条消息的旅程)
    this.tourActive = false;
    this.tourStepIndex = 0;
    this.tourTimer = 0;

    // 相机平滑插值目标
    this.camTargetPos = null;
    this.camTargetLook = null;

    this._initThree();
    this._buildWorld();
    this._buildFloatingPins();
    this._bindUI();
    this._bindPointer();
    this.setNightMode(this.isNight); // 全部建筑及发光材质创建后统一应用，首帧即白昼

    // 默认选中城心「桌面 · VCPProxy 总闸」展示架构信息
    const defaultMeta = VCHAT_CITY.buildings.find((b) => b.id === 'v-desktop');
    if (defaultMeta) this.selectBuilding(defaultMeta, false);

    this.clock = new THREE.Clock();
    this._animate();
  }

  _initThree() {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      38,
      window.innerWidth / window.innerHeight,
      0.5,
      320
    );
    // 相机与 target 同向偏东 (+12)，使整个双城沙盘向左平移至屏幕黄金中心，完美避开右侧 340px 档案抽屉
    this.camera.position.set(11, 44, 78);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    // 接入 UnrealBloomPass 真 GPU 霓虹辉光后处理管线
    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.72, // strength：星夜霓虹辉光强度
      0.55, // radius：光晕柔和扩散半径
      0.62  // threshold：仅对高能发光部位与灯窗触发 Bloom
    );
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloomPass);

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.maxPolarAngle = Math.PI * 0.48; // 允许低角度平视地下河剖面
    this.controls.minDistance = 12;
    this.controls.maxDistance = 145;
    this.controls.target.set(11, 1.0, 0);

    window.addEventListener('resize', () => this._onResize());
  }

  _buildWorld() {
    this.mats = new CeramicMaterialSystem(this.scene);


    this.bf = new BuildingFactory(this.mats);
    this.strata = new CityStrataBuilder(this.scene, this.mats, this.bf);
    this.strata.buildAll();

    // 选中建筑时的底部高亮光标环
    const selGeo = new THREE.RingGeometry(2.8, 3.35, 36);
    selGeo.rotateX(-Math.PI / 2);
    this.selectionRing = new THREE.Mesh(
      selGeo,
      this.mats.getEnergyMaterial(0xB94832, 1.35)
    );
    this.selectionRing.position.y = 0.15;
    this.selectionRing.visible = false;
    this.scene.add(this.selectionRing);
  }

  // 为关键地标建立悬浮 2D 铭牌锚点 (随 3D 坐标实时投影)
  _buildFloatingPins() {
    this.pinItems = [];
    const keyItems = [
      ...TOOLBOX_CITY.coreBuildings.filter((b) =>
        ['server-js', 'admin-server', 'plugin-hub', 'knowledge-manager', 'aa-bus'].includes(b.id)
      ),
      ...VCHAT_CITY.buildings.filter((b) => b.landmark),
      ...SATELLITE_ISLANDS,
      ...SUBTERRANEAN_NODES.filter((s) => s.id === 'sub-rivermemo' || s.id === 'sub-toolrecordsql'),
    ];

    for (const item of keyItems) {
      const el = document.createElement('button');
      el.className = 'city-pin';
      el.dataset.layer = item.layer || 'skyline';
      el.innerHTML = `<span class="pin-dot"></span><span class="pin-text">${item.icon ? item.icon + ' ' : ''}${item.name.split(' · ')[0]}</span>`;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this.stopTour();
        this.selectBuilding(item, true);
      });
      this.labelsContainer.appendChild(el);

      const topY = (item.pos.y ?? 0) + (item.size ? item.size.h + 2.2 : 8.5);
      this.pinItems.push({
        el,
        meta: item,
        worldPos: new THREE.Vector3(item.pos.x, topY, item.pos.z),
      });
    }
  }

  _bindUI() {
    // 1. 五拍生长按钮组
    const beatBar = document.getElementById('beat-buttons');
    GROWTH_BEATS.forEach((b) => {
      const btn = document.createElement('button');
      btn.className = `beat-btn ${b.beat === this.activeBeat ? 'active' : ''}`;
      btn.dataset.beat = b.beat;
      btn.innerHTML = `<span class="beat-num">${b.code}</span><span class="beat-name">${b.title.split(' · ')[1]}</span>`;
      btn.addEventListener('click', () => {
        this.stopTour();
        this.setBeat(b.beat, true);
      });
      beatBar.appendChild(btn);
    });
    this._updateBeatBanner(this.activeBeat);

    // 2. 昼夜切换按钮 (同步联动 NextUI 天象台)
    const themeBtn = document.getElementById('btn-toggle-theme');
    themeBtn.addEventListener('click', () => this.toggleNightMode());

    // 3. 地质剖切 X-Ray 按钮
    const xrayBtn = document.getElementById('btn-toggle-xray');
    xrayBtn.addEventListener('click', () => {
      this.setXrayMode(!this.isXray);
    });

    // 4. 一条消息的旅程 导览按钮
    const tourBtn = document.getElementById('btn-start-tour');
    tourBtn.addEventListener('click', () => {
      if (this.tourActive) {
        this.stopTour();
      } else {
        this.startTour();
      }
    });

    // 5. 全景复位按钮
    document.getElementById('btn-reset-cam').addEventListener('click', () => {
      this.stopTour();
      this.setXrayMode(false);
      this.flyTo(new THREE.Vector3(11, 44, 78), new THREE.Vector3(11, 1.0, 0));
    });

    // 6. 四层地质快捷视角按钮
    const strataContainer = document.getElementById('strata-buttons');
    STRATA_LAYERS.forEach((layer) => {
      const btn = document.createElement('button');
      btn.className = 'strata-pill';
      btn.innerHTML = `<span class="strata-dot" style="background:${layer.color}"></span><span>${layer.name.split(' · ')[0]}</span>`;
      btn.title = layer.summary;
      btn.addEventListener('click', () => {
        this.stopTour();
        this.focusStrataLayer(layer.id);
      });
      strataContainer.appendChild(btn);
    });

    // 7. 滚轮在按住 Shift 时可直接推进/回退五拍时间轴
    window.addEventListener(
      'wheel',
      (e) => {
        if (!e.shiftKey) return;
        e.preventDefault();
        const dir = e.deltaY > 0 ? 1 : -1;
        const nextBeat = Math.max(1, Math.min(5, this.activeBeat + dir));
        if (nextBeat !== this.activeBeat) {
          this.setBeat(nextBeat, false);
        }
      },
      { passive: false }
    );
  }

  _bindPointer() {
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    let downX = 0;
    let downY = 0;

    this.canvas.addEventListener('pointerdown', (e) => {
      downX = e.clientX;
      downY = e.clientY;
      // 用户主动拖拽时中断自动相机插值
      this.camTargetPos = null;
      this.camTargetLook = null;
    });

    this.canvas.addEventListener('pointermove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hits = this.raycaster.intersectObjects(this.bf.pickableMeshes, false);
      this.canvas.style.cursor = hits.length > 0 ? 'pointer' : 'grab';
    });

    this.canvas.addEventListener('pointerup', (e) => {
      const dist = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (dist > 6) return; // 区分拖拽与点击

      const rect = this.canvas.getBoundingClientRect();
      this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hits = this.raycaster.intersectObjects(this.bf.pickableMeshes, false);
      if (hits.length > 0) {
        const meta = hits[0].object.userData.cityMeta;
        if (meta) {
          this.stopTour();
          this.selectBuilding(meta, true);
          // 彩蛋：点击「主题 · NextUI 天象台」直接触发全城昼夜广播！
          if (meta.id === 'v-theme') {
            this.toggleNightMode();
          }
        }
      }
    });
  }

  setBeat(beat, moveCamera = false) {
    this.activeBeat = beat;
    document.querySelectorAll('.beat-btn').forEach((btn) => {
      btn.classList.toggle('active', Number(btn.dataset.beat) === beat);
    });
    this._updateBeatBanner(beat);

    if (moveCamera) {
      const camPresets = {
        1: { pos: [-16, 26, 36], look: [-28, 4, 0] },
        2: { pos: [38, 28, 42], look: [26, 4, 0] },
        3: { pos: [0, 32, 56], look: [-1, 3, 0] },
        4: { pos: [0, 56, 86], look: [0, 0, -4] },
        5: { pos: [6, 42, 72], look: [4, 3, 0] },
      };
      const p = camPresets[beat];
      if (p) {
        this.flyTo(new THREE.Vector3(...p.pos), new THREE.Vector3(...p.look));
      }
    }
  }

  _updateBeatBanner(beat) {
    const info = GROWTH_BEATS.find((b) => b.beat === beat);
    if (!info) return;
    document.getElementById('beat-title').textContent = info.title;
    document.getElementById('beat-desc').textContent = info.desc;
  }

  toggleNightMode() {
    this.setNightMode(!this.isNight);
  }

  setNightMode(isNight) {
    this.isNight = isNight;
    document.body.classList.toggle('theme-night', this.isNight);
    this.mats.setNightMode(this.isNight);
    if (this.bloomPass) {
      this.bloomPass.strength = this.isNight ? 0.72 : 0.22;
      this.bloomPass.threshold = this.isNight ? 0.62 : 0.85;
    }

    const btn = document.getElementById('btn-toggle-theme');
    btn.innerHTML = this.isNight
      ? '<span>🌙 石墨星夜 · Cyber Night</span>'
      : '<span>☀️ 暖纸晨光 · Paper Day</span>';
  }

  setXrayMode(enabled) {
    this.isXray = enabled;
    this.strata.setXrayMode(enabled);
    const btn = document.getElementById('btn-toggle-xray');
    btn.classList.toggle('active', enabled);
    btn.innerHTML = enabled
      ? '<span>🔍 地质透视：已开启</span>'
      : '<span>⛏️ 地质剖切 · 透视地下河</span>';
  }

  focusStrataLayer(layerId) {
    if (layerId === 'utility' || layerId === 'river') {
      this.setXrayMode(true);
      const y = layerId === 'river' ? -8.5 : -4.0;
      this.flyTo(new THREE.Vector3(0, 8, 42), new THREE.Vector3(0, y, 0));
    } else {
      this.setXrayMode(false);
      const y = layerId === 'street' ? 1.5 : 6.0;
      this.flyTo(new THREE.Vector3(0, 34, 62), new THREE.Vector3(0, y, 0));
    }
  }

  selectBuilding(meta, fly = true) {
    this.selectedMeta = meta;

    // 更新右侧建筑档案抽屉
    document.getElementById('insp-category').textContent =
      meta.subtitle || meta.category || 'VCP 核心节点';
    document.getElementById('insp-title').textContent =
      `${meta.icon ? meta.icon + ' ' : ''}${meta.name}`;
    document.getElementById('insp-story').textContent = meta.story || '';
    document.getElementById('insp-inflow').textContent = meta.inflow || '—';
    document.getElementById('insp-outflow').textContent = meta.outflow || '—';
    document.getElementById('insp-depends').textContent = meta.dependsOn || '—';

    const sigBox = document.getElementById('insp-signature-box');
    if (meta.signatureAction) {
      sigBox.style.display = 'block';
      document.getElementById('insp-signature').textContent = meta.signatureAction;
    } else {
      sigBox.style.display = 'none';
    }

    // 移动底部高亮环
    if (meta.pos) {
      this.selectionRing.visible = true;
      this.selectionRing.position.set(meta.pos.x, (meta.pos.y ?? 0) + 0.18, meta.pos.z);
    } else {
      this.selectionRing.visible = false;
    }

    // 若选中地下节点，自动开启地质透视
    if (meta.layer === 'utility' || meta.layer === 'river') {
      this.setXrayMode(true);
    }

    if (fly && meta.pos) {
      const py = meta.pos.y ?? 0;
      const h = meta.size ? meta.size.h * 0.5 : 3.0;
      const look = new THREE.Vector3(meta.pos.x, py + h * 0.5, meta.pos.z);
      const offset = new THREE.Vector3(
        meta.pos.x * 0.15 + 12,
        Math.max(8, py + h + 9),
        meta.pos.z + 18
      );
      this.flyTo(offset, look);
    }
  }

  flyTo(targetPos, targetLook) {
    this.camTargetPos = targetPos.clone();
    this.camTargetLook = targetLook.clone();
  }

  // ============================================================================
  // 「一条消息的旅程」自动运镜导览 (6 站式贯穿全城)
  // ============================================================================
  startTour() {
    this.tourActive = true;
    this.tourStepIndex = 0;
    this.tourTimer = 0;
    this.setBeat(5, false);

    const btn = document.getElementById('btn-start-tour');
    btn.classList.add('active');
    btn.innerHTML = '<span>⏹️ 停止导览 · 自由漫游</span>';

    document.getElementById('tour-toast').classList.add('visible');
    this._applyTourStep(0);
  }

  stopTour() {
    if (!this.tourActive) return;
    this.tourActive = false;
    const btn = document.getElementById('btn-start-tour');
    btn.classList.remove('active');
    btn.innerHTML = '<span>✨ 一条消息的旅程 · 导览</span>';
    document.getElementById('tour-toast').classList.remove('visible');
  }

  _applyTourStep(idx) {
    const stop = MESSAGE_JOURNEY_STOPS[idx];
    if (!stop) return;

    document.getElementById('tour-step-title').textContent = stop.title;
    document.getElementById('tour-step-detail').textContent = stop.detail;

    this.setXrayMode(Boolean(stop.requireXray));
    this.flyTo(
      new THREE.Vector3(stop.cam.x, stop.cam.y, stop.cam.z),
      new THREE.Vector3(stop.focus.x, stop.focus.y, stop.focus.z)
    );

    const allNodes = [
      ...TOOLBOX_CITY.coreBuildings,
      ...VCHAT_CITY.buildings,
      ...SATELLITE_ISLANDS,
      ...UNDERGROUND_UTILITIES,
      ...SUBTERRANEAN_NODES,
    ];
    const found = allNodes.find((n) => n.id === stop.highlightId);
    if (found) {
      this.selectBuilding(found, false);
    }
  }

  _updateFloatingPins() {
    const halfW = window.innerWidth / 2;
    const halfH = window.innerHeight / 2;
    const tempV = new THREE.Vector3();
    const placedBoxes = [];

    // 右侧抽屉与顶部/底部 HUD 安全避让区
    const rightHudLeft = window.innerWidth - 370;

    for (const item of this.pinItems) {
      const isSelected = this.selectedMeta && this.selectedMeta.id === item.meta.id;
      const beatVisible = (item.meta.beat || 1) <= this.activeBeat;
      const isUnderground = item.meta.layer === 'river' || item.meta.layer === 'utility';
      if (!beatVisible || (isUnderground && !this.isXray)) {
        item.el.style.opacity = '0';
        item.el.style.pointerEvents = 'none';
        continue;
      }

      tempV.copy(item.worldPos);
      tempV.project(this.camera);

      if (tempV.z > 1) {
        item.el.style.opacity = '0';
        item.el.style.pointerEvents = 'none';
        continue;
      }

      const x = tempV.x * halfW + halfW;
      const y = -tempV.y * halfH + halfH;

      // 避开右侧抽屉和上下 HUD 边缘
      if (!isSelected && (x > rightHudLeft || x < 140 || y < 85 || y > window.innerHeight - 105)) {
        item.el.style.opacity = '0';
        item.el.style.pointerEvents = 'none';
        continue;
      }

      // 屏幕空间防重叠碰撞检测 (优先保留选中项与前排主地标)
      let collided = false;
      if (!isSelected) {
        for (const box of placedBoxes) {
          if (Math.abs(x - box.x) < 105 && Math.abs(y - box.y) < 30) {
            collided = true;
            break;
          }
        }
      }

      if (collided) {
        item.el.style.opacity = '0';
        item.el.style.pointerEvents = 'none';
        continue;
      }

      placedBoxes.push({ x, y });
      item.el.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      item.el.style.opacity = '1';
      item.el.style.pointerEvents = 'auto';
      item.el.classList.toggle('selected', Boolean(isSelected));
    }
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    if (this.composer) {
      this.composer.setSize(window.innerWidth, window.innerHeight);
    }
  }

  _animate() {
    requestAnimationFrame(() => this._animate());

    const dt = Math.min(0.05, this.clock.getDelta());
    const elapsed = this.clock.getElapsedTime();

    // 1. 更新建筑招牌动作與五拍生长缩放
    this.bf.update(elapsed, dt, this.activeBeat);

    // 2. 更新跨海大桥、地下管网脉冲与庄园居民光点
    this.strata.update(elapsed, this.activeBeat);

    // 3. 选中光标环呼吸旋转
    if (this.selectionRing.visible) {
      this.selectionRing.rotation.z = elapsed * 1.2;
      const s = 1 + Math.sin(elapsed * 3.5) * 0.06;
      this.selectionRing.scale.setScalar(s);
    }

    // 4. 导览计时推进
    if (this.tourActive) {
      this.tourTimer += dt;
      if (this.tourTimer > 6.2) {
        this.tourTimer = 0;
        this.tourStepIndex = (this.tourStepIndex + 1) % MESSAGE_JOURNEY_STOPS.length;
        this._applyTourStep(this.tourStepIndex);
      }
    }

    // 5. 平滑相机飞行插值
    if (this.camTargetPos && this.camTargetLook) {
      const lerpFactor = Math.min(1, dt * 3.6);
      this.camera.position.lerp(this.camTargetPos, lerpFactor);
      this.controls.target.lerp(this.camTargetLook, lerpFactor);
      if (
        this.camera.position.distanceTo(this.camTargetPos) < 0.15 &&
        this.controls.target.distanceTo(this.camTargetLook) < 0.15
      ) {
        this.camTargetPos = null;
        this.camTargetLook = null;
      }
    }

    this.controls.update();
    this._updateFloatingPins();
    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => {
    window.__VCP_CITY__ = new VCPMetropolisApp();
  });
} else {
  window.__VCP_CITY__ = new VCPMetropolisApp();
}