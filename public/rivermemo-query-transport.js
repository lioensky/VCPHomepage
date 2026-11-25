/* 第九章教学夹具：单条跨簇边，一个预选的度数对照，不连接数据库。 */
(function (global) {
    'use strict';
    // S=0，T=1，中继=2，外邻域=3，对照=4。第 0 项是跨簇边。
    const csr = {
        offsets: [0, 2, 3, 5, 5, 6],
        targets: [1, 2, 3, 1, 3, 3],
        weights: [.45, .35, .8, .15, .65, .1],
    };
    function ordinaryRow(node) {
        const row = [];
        for (let i = csr.offsets[node]; i < csr.offsets[node + 1]; i++) {
            if (i !== 0) row.push([csr.targets[i], csr.weights[i]]);
        }
        return row;
    }
    function evaluate(firstHop) {
        const twoHop = new Map();
        for (const [mid, w] of ordinaryRow(0)) {
            for (const [end, v] of ordinaryRow(mid)) {
                twoHop.set(end, (twoHop.get(end) || 0) + w * v);
            }
        }
        const support = node => ordinaryRow(node).reduce((sum, [end, w]) =>
            sum + (end > 1 ? w * (twoHop.get(end) || 0) : 0), 0);
        const u = support(1), b = support(4);
        const d = csr.weights[0], a = twoHop.get(1) || 0;
        const shortcut = d / (d + a);
        const contrast = u > b ? (u - b) / (u + b) : 0;
        // 两个流量均来自同一显式源的本次非回流首跳，依 CSR 行顺序。
        const total = firstHop[0] + firstHop[1];
        const share = total > 0 ? firstHop[0] / total : 0;
        const omega = shortcut * contrast * share;
        return { shortcut, contrast, share, omega, angle: omega * Math.PI / 2 };
    }
    // 本夹具的源、目标为 x、y 单位轴；其余显式焦点在 z 轴上。
    function rotate([x, y, z], angle) {
        const c = Math.cos(angle), s = Math.sin(angle);
        return [x * c - y * s, x * s + y * c, z];
    }
    const query = [Math.sqrt(.96), 0, .2];
    global.RiverQueryTransport = { evaluate, rotate, query };
})(window);