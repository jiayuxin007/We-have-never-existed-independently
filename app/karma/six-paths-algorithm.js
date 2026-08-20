/**
 * 六道算法核心模块
 * 
 * 数据来源：CoinGecko API / Binance API
 * 输入：P(价格)、V(24h成交额)、MC(市值)、H(24h最高)、L(24h最低)
 * 输出：六道之一及其可视化参数
 * 
 * 用户交互数据采集：预留接口，后续实现
 */

const SIX_PATHS_ALGORITHM = (function () {
    'use strict';

    // ========== 1. API 配置 ==========
    const API = {
        COINGECKO: {
            BASE: 'https://api.coingecko.com/api/v3',
            COIN_DETAIL: (coinId) => `${API.COINGECKO.BASE}/coins/${coinId}`,
        },
        CURRENCY: 'usd',
    };

    // ========== 2. 计算的三个维度因子 ==========
    /**
     * A. 波动率因子 Vol —— 情绪剧烈程度
     * Vol = [(H – L)/L] * 100
     */
    function calcVolatility(H, L) {
        if (!L || L <= 0) return 0;
        return ((H - L) / L) * 100;
    }

    /**
     * B. 换手率因子 Turn —— 投机/盲从程度
     * Turn = V / MC
     */
    function calcTurnover(V, MC) {
        if (!MC || MC <= 0) return 0;
        return V / MC;
    }

    /**
     * C. 市值稳定性因子 Stab —— 共识强度
     * Stab = log10(MC)
     */
    function calcStability(MC) {
        if (!MC || MC <= 0) return 0;
        return Math.log10(MC);
    }

    // 小工具：截断到 [0,1]
    function clamp01(x) {
        if (x < 0) return 0;
        if (x > 1) return 1;
        return x;
    }

    // ========== 3. 六道判定逻辑 ==========
    const SIX_PATHS = {
        TIAN_DAO: 'tian',      // 天道
        REN_DAO: 'ren',        // 人道
        XIU_LUO_DAO: 'xiuluo', // 修罗道
        CHU_SHENG_DAO: 'chusheng', // 畜生道
        E_GUI_DAO: 'egui',     // 饿鬼道
        DI_YU_DAO: 'diyu',     // 地狱道
    };

    const PATH_CONFIG = {
        // 结合实际市场数据重新调参，让结果更有分布感：
        // - 对主流币：Vol 常在 1%~10%，Turn 在 0.01~0.1，Stab 在 9~12
        // - 原阈值过于极端，几乎都落在人道，这里改成“区间 + 相对极端”的划分
        [SIX_PATHS.TIAN_DAO]: {
            name: '天道',
            // 高共识 + 低波动：大市值、价格很稳
            // 例如：比特币在非常平静的一天，或强势稳定阶段
            condition: (vol, turn, stab, priceChange24h) =>
                stab > 10.5 && vol < 4 && turn >= 0.005 && turn <= 0.06,
            params: { uFlowSpeed: 0.2, uNoise: 0.05 },
            colors: ['#FFD700', '#FFFFFF'],
        },
        [SIX_PATHS.REN_DAO]: {
            name: '人道',
            // 正常交易区：有一定成交、波动不算极端，适用于大多数“日常状态”
            condition: (vol, turn, stab, priceChange24h) =>
                turn >= 0.02 && turn <= 0.08 && stab > 8,
            params: { uFlowSpeed: 0.8, uNoise: 0.2 },
            colors: ['#4488FF', '#FFFFFF'],
        },
        [SIX_PATHS.XIU_LUO_DAO]: {
            name: '修罗道',
            // 情绪偏激：波动显著偏大 + 换手偏高
            // 例如热点币、题材币在剧烈拉涨或砸盘中
            condition: (vol, turn, stab, priceChange24h) =>
                vol >= 8 && turn >= 0.04,
            params: { uFlowSpeed: 2.5, uNoise: 0.8 },
            colors: ['#FF0033', '#4400AA'],
        },
        [SIX_PATHS.CHU_SHENG_DAO]: {
            name: '畜生道',
            // 市值共识偏弱 + 换手极高：更接近疯狂追涨杀跌的小盘 / 迷因
            condition: (vol, turn, stab, priceChange24h) =>
                stab <= 8.5 && turn >= 0.1,
            params: { uFlowSpeed: 1.5, uNoise: 1.2 },
            colors: ['#00FF88', '#555555'],
        },
        [SIX_PATHS.E_GUI_DAO]: {
            name: '饿鬼道',
            // 极低换手 + 小市值：长期无人问津 / 流动性枯竭
            condition: (vol, turn, stab, priceChange24h) =>
                stab < 9 && turn < 0.02,
            params: { uFlowSpeed: 0.05, uCollapse: 0.9 },
            colors: ['#333333', '#221100'],
        },
        [SIX_PATHS.DI_YU_DAO]: {
            name: '地狱道',
            // 大幅杀跌或极端波动：放宽到日跌幅 > 15% 或 24h 波动 > 20%
            condition: (vol, turn, stab, priceChange24h) =>
                (priceChange24h !== null && priceChange24h < -15) || vol > 20,
            params: { uGravity: 5.0, uChaos: 2.0 },
            colors: ['#FF4400', '#000000'],
        },
    };

    /**
     * 根据 Vol / Turn / Stab 的特征 + 随机偏置划分六道
     *
     * 设计思路：
     * - 把 Vol / Turn / Stab 标准化到 0~1：
     *   vN: 波动强度    tN: 换手强度    sN: 共识强度（市值）
     * - 构造语义特征：
     *   chaos      = 情绪/混乱度（波动 + 换手）
     *   consensus  = 共识强度（大盘程度）
     *   illiquidity= 流动性枯竭程度（换手越低越高）
     * - 每一道有一个“权重函数”，再乘一点随机噪声，按权重随机抽一道
     *   → 既受数据影响，又保证六道都能出现。
     */
    function determinePath(vol, turn, stab, priceChange24h) {
        // 1. 标准化到 0~1（区间可根据真实数据再调）
        const vRaw = isFinite(vol) ? vol : 0;
        const tRaw = isFinite(turn) ? turn : 0;
        const sRaw = isFinite(stab) ? stab : 0;
        const pRaw = isFinite(priceChange24h) ? priceChange24h : 0;

        const vN = clamp01(vRaw / 18);         // 0~18% 日振幅 → 0~1（BTC 常在 2%~12%）
        const tN = clamp01(tRaw / 0.06);       // Turn 0~0.06 → 0~1（BTC 常在 0.002~0.03）
        const sN = clamp01((sRaw - 9) / 5);    // Stab 9~14 → 0~1

        // 2. 语义特征
        const chaos = 0.6 * vN + 0.4 * tN;           // 情绪/混乱度
        const consensus = sN;                        // 共识强度
        const illiquidity = 1 - tN;                  // 流动性枯竭度
        const drop = Math.max(0, -pRaw / 28);        // 28% 日跌才顶满，10% 约为 0.36

        // 3. 为每一道定义基础权重（>0），再用特征做偏置
        let wTian      = 1 + 0.8 * consensus - 0.35 * chaos;
        let wRen       = 1.15 + 0.45 * (1 - Math.abs(chaos - 0.45));
        let wXiuluo    = 1 + 0.55 * chaos + 0.25 * tN;
        let wChusheng  = 1 + 0.7 * (1 - consensus) * tN;
        let wEgui      = 1 + 0.7 * illiquidity * (1 - consensus);
        let wDiyu      = 1 + 0.45 * chaos + 0.55 * drop;

        // 4. 加一点随机噪声，避免死板（±20% 范围）
        function jitter(w) {
            const noise = 0.2 * (Math.random() - 0.5); // -0.1~0.1
            return Math.max(0.1, w * (1 + noise));
        }

        wTian     = jitter(wTian);
        wRen      = jitter(wRen);
        wXiuluo   = jitter(wXiuluo);
        wChusheng = jitter(wChusheng);
        wEgui     = jitter(wEgui);
        wDiyu     = jitter(wDiyu);

        const weights = {
            tian:     wTian,
            ren:      wRen,
            xiuluo:   wXiuluo,
            chusheng: wChusheng,
            egui:     wEgui,
            diyu:     wDiyu,
        };

        // 5. 按权重随机抽一道
        const ids = [
            SIX_PATHS.TIAN_DAO,
            SIX_PATHS.REN_DAO,
            SIX_PATHS.XIU_LUO_DAO,
            SIX_PATHS.CHU_SHENG_DAO,
            SIX_PATHS.E_GUI_DAO,
            SIX_PATHS.DI_YU_DAO,
        ];

        const weightList = [
            weights.tian,
            weights.ren,
            weights.xiuluo,
            weights.chusheng,
            weights.egui,
            weights.diyu,
        ];

        const totalW = weightList.reduce((a, b) => a + b, 0);
        const r = Math.random() * totalW;
        let acc = 0;
        let chosenIndex = 0;
        for (let i = 0; i < weightList.length; i++) {
            acc += weightList[i];
            if (r <= acc) {
                chosenIndex = i;
                break;
            }
        }

        const pathId = ids[chosenIndex] || SIX_PATHS.REN_DAO;
        const cfg = PATH_CONFIG[pathId] || PATH_CONFIG[SIX_PATHS.REN_DAO];

        return {
            pathId,
            name: cfg.name,
            params: { ...cfg.params },
            colors: [...cfg.colors],
            debug: {
                vN, tN, sN,
                chaos,
                consensus,
                illiquidity,
                drop,
                weights,
                rand: r,
                totalWeight: totalW,
            },
        };
    }

    /**
     * 与 determinePath 一致的语义指标（供 UI 面板展示，不抽道）
     */
    function computeSemanticMetrics(vol, turn, stab, priceChange24h) {
        const vRaw = isFinite(vol) ? vol : 0;
        const tRaw = isFinite(turn) ? turn : 0;
        const sRaw = isFinite(stab) ? stab : 0;
        const pRaw = isFinite(priceChange24h) ? priceChange24h : 0;
        const vN = clamp01(vRaw / 18);
        const tN = clamp01(tRaw / 0.06);
        const sN = clamp01((sRaw - 9) / 5);
        return {
            chaos: 0.6 * vN + 0.4 * tN,
            consensus: sN,
            illiquidity: 1 - tN,
            drop: Math.max(0, -pRaw / 28),
            vN,
            tN,
            sN,
        };
    }

    // ========== 4. 从 CoinGecko 拉取数据 ==========
    /**
     * 从 CoinGecko 获取币种市场数据
     * @param {string} coinId - 币种 id，如 'bitcoin', 'ethereum'
     * @returns {Promise<{P, V, MC, H, L, priceChange24h}>}
     */
    async function fetchFromCoinGecko(coinId = 'bitcoin') {
        const url = `${API.COINGECKO.COIN_DETAIL(coinId)}?localization=false&tickers=false&community_data=false&developer_data=false`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`CoinGecko API 错误: ${res.status}`);

        const data = await res.json();
        const md = data.market_data || {};
        const c = API.CURRENCY;

        const P = md.current_price?.[c] ?? 0;
        const V = md.total_volume?.[c] ?? 0;
        const MC = md.market_cap?.[c] ?? 0;
        const H = md.high_24h?.[c] ?? P;
        const L = md.low_24h?.[c] ?? P;
        const priceChange24h = md.price_change_percentage_24h ?? null;

        return { P, V, MC, H, L, priceChange24h };
    }

    // ========== 5. 单次：拉取 → 计算 → 判定 ==========
    /**
     * 执行完整六道算法
     * @param {string} coinId - 币种 id
     * @param {Object} userInteraction - 预留：用户交互数据，后续接入
     * @returns {Promise<Object>} 完整结果
     */
    async function run(coinId = 'bitcoin', userInteraction = null) {
        const raw = await fetchFromCoinGecko(coinId);

        const vol = calcVolatility(raw.H, raw.L);
        const turn = calcTurnover(raw.V, raw.MC);
        const stab = calcStability(raw.MC);

        const result = determinePath(
            vol,
            turn,
            stab,
            raw.priceChange24h
        );

        return {
            path: result,
            metrics: {
                Vol: vol,
                Turn: turn,
                Stab: stab,
            },
            raw: {
                P: raw.P,
                V: raw.V,
                MC: raw.MC,
                H: raw.H,
                L: raw.L,
                priceChange24h: raw.priceChange24h,
            },
            userInteraction: userInteraction, // 预留
        };
    }

    // ========== 6. 会话级：十二因缘期间的动态采样与最终归类 ==========
    /**
     * 会话状态：用于在十二因缘运行期间累积指标
     */
    const sessionState = {
        active: false,
        coinId: 'bitcoin',
        sumVol: 0,
        sumTurn: 0,
        sumStab: 0,
        maxVol: 0,
        minTurn: Infinity,
        minPriceChange24h: 0,
        timeInPath: null,
        totalTime: 0,
    };

    function resetSessionState(coinId = 'bitcoin') {
        sessionState.active = true;
        sessionState.coinId = coinId;
        sessionState.sumVol = 0;
        sessionState.sumTurn = 0;
        sessionState.sumStab = 0;
        sessionState.maxVol = 0;
        sessionState.minTurn = Infinity;
        sessionState.minPriceChange24h = 0;
        sessionState.timeInPath = {
            [SIX_PATHS.TIAN_DAO]: 0,
            [SIX_PATHS.REN_DAO]: 0,
            [SIX_PATHS.XIU_LUO_DAO]: 0,
            [SIX_PATHS.CHU_SHENG_DAO]: 0,
            [SIX_PATHS.E_GUI_DAO]: 0,
            [SIX_PATHS.DI_YU_DAO]: 0,
        };
        sessionState.totalTime = 0;
    }

    /**
     * 开启 / 重置一个新的十二因缘会话
     * @param {string} coinId
     */
    function startSession(coinId = 'bitcoin') {
        resetSessionState(coinId);
    }

    /**
     * 获取当前会话快照（用于调试或可视化）
     */
    function getSessionSnapshot() {
        if (!sessionState.active) return null;
        return JSON.parse(JSON.stringify(sessionState));
    }

    /**
     * 会话期间每一“刻”的采样（REST 版本）
     * - 典型用法：在动画的每个阶段 / 每隔 dt 秒调用一次
     * @param {number} dtSeconds 本次采样代表的时间长度（秒）
     * @param {Object} userInteraction 本刻的用户交互数据（预留，当前仅透传）
     * @returns {Promise<Object>} 返回本刻即时的判定结果（可用于实时可视化）
     */
    async function tickSession(dtSeconds = 5, userInteraction = null) {
        if (!sessionState.active) {
            // 如果用户忘记先 startSession，则自动初始化
            resetSessionState(sessionState.coinId || 'bitcoin');
        }

        const raw = await fetchFromCoinGecko(sessionState.coinId);

        const vol = calcVolatility(raw.H, raw.L);
        const turn = calcTurnover(raw.V, raw.MC);
        const stab = calcStability(raw.MC);

        return tickFromComputed(
            {
                P: raw.P,
                V: raw.V,
                MC: raw.MC,
                H: raw.H,
                L: raw.L,
                priceChange24h: raw.priceChange24h,
            },
            { vol, turn, stab },
            dtSeconds,
            userInteraction
        );
    }

    /**
     * WebSocket / 盘口流使用：
     * 已经从流里拿到 P/V/MC/H/L/priceChange24h，直接计算并累计。
     *
     * @param {{P:number,V:number,MC:number,H:number,L:number,priceChange24h:number|null}} raw
     * @param {{vol:number,turn:number,stab:number}|null} preComputed 可选：如果你已在外面算好 Vol/Turn/Stab，可直接传入
     * @param {number} dtSeconds 本次采样代表的时间长度（秒），通常是“本次事件距上次事件的时间差”
     * @param {Object} userInteraction 本刻的用户交互数据（预留，当前仅透传）
     * @returns {Object} 返回本刻即时判定结果
     */
    function tickFromStream(raw, preComputed = null, dtSeconds = 1, userInteraction = null) {
        if (!sessionState.active) {
            // 如果用户忘记先 startSession，可以选择自动开启；
            // 这里保持一致，自动以当前 coinId 启动
            resetSessionState(sessionState.coinId || 'stream');
        }

        const vol = preComputed && typeof preComputed.vol === 'number'
            ? preComputed.vol
            : calcVolatility(raw.H, raw.L);
        const turn = preComputed && typeof preComputed.turn === 'number'
            ? preComputed.turn
            : calcTurnover(raw.V, raw.MC);
        const stab = preComputed && typeof preComputed.stab === 'number'
            ? preComputed.stab
            : calcStability(raw.MC);

        return tickFromComputed(raw, { vol, turn, stab }, dtSeconds, userInteraction);
    }

    /**
     * 内部公共逻辑：基于已算好的 Vol/Turn/Stab 更新 session
     */
    function tickFromComputed(raw, metrics, dtSeconds, userInteraction) {
        const { vol, turn, stab } = metrics;

        const path = determinePath(
            vol,
            turn,
            stab,
            raw.priceChange24h
        );

        const dt = Math.max(0, dtSeconds || 0);

        // 时间加权累积
        sessionState.sumVol += vol * dt;
        sessionState.sumTurn += turn * dt;
        sessionState.sumStab += stab * dt;
        sessionState.totalTime += dt;

        // 极值与价格跌幅
        sessionState.maxVol = Math.max(sessionState.maxVol, vol);
        sessionState.minTurn = Math.min(sessionState.minTurn, turn);
        if (raw.priceChange24h != null) {
            sessionState.minPriceChange24h = Math.min(
                sessionState.minPriceChange24h,
                raw.priceChange24h
            );
        }

        // 各道停留时间
        if (sessionState.timeInPath && path && path.pathId in sessionState.timeInPath) {
            sessionState.timeInPath[path.pathId] += dt;
        }

        return {
            path,
            metrics: { Vol: vol, Turn: turn, Stab: stab },
            raw: {
                P: raw.P,
                V: raw.V,
                MC: raw.MC,
                H: raw.H,
                L: raw.L,
                priceChange24h: raw.priceChange24h,
            },
            userInteraction,
        };
    }

    /**
     * 根据用户交互汇总计算对六道的“偏好得分”（0~1，和为 1）
     * 用于与市场停留占比结合，得到最终归属
     * @param {{ clickCount: number, moveDistance: number, scrollDelta: number, wheelDelta: number, dragCount: number, dragDistance: number, dragDuration: number, dwellSeconds: number }} summary
     * @returns {Object.<string, number>} pathId -> score
     */
    function userSummaryToPathBias(summary) {
        if (!summary || typeof summary.dwellSeconds !== 'number') {
            const equal = 1 / 6;
            return {
                [SIX_PATHS.TIAN_DAO]: equal,
                [SIX_PATHS.REN_DAO]: equal,
                [SIX_PATHS.XIU_LUO_DAO]: equal,
                [SIX_PATHS.CHU_SHENG_DAO]: equal,
                [SIX_PATHS.E_GUI_DAO]: equal,
                [SIX_PATHS.DI_YU_DAO]: equal,
            };
        }
        const dwell = Math.max(0.5, summary.dwellSeconds);
        const clicks = summary.clickCount || 0;
        const move = summary.moveDistance || 0;
        const scroll = summary.scrollDelta || 0;
        const wheel = summary.wheelDelta || 0;
        const dragCount = summary.dragCount || 0;
        const dragDistance = summary.dragDistance || 0;
        const dragDuration = summary.dragDuration || 0;
        const ritualClicks = 8;
        const extraClicks = Math.max(0, clicks - ritualClicks);
        const activity = (
            extraClicks * 2
            + move / 500
            + scroll / 300
            + wheel / 400
            + dragDistance / 800
            + dragCount * 0.5
        );
        const activityNorm = Math.min(1, activity / 20);
        const patience = Math.min(1, dwell / 60);
        const erratic = Math.min(1, (extraClicks / dwell) / 2.5);
        const dragNorm = Math.min(1, dragDistance / 1200 + dragCount / 6);
        const dragIntensity = Math.min(1, dragDuration / 20);
        const chaos = Math.min(1, (
            move / 2000
            + scroll / 1000
            + wheel / 800
            + dragDistance / 1500
        ));

        const raw = {
            [SIX_PATHS.TIAN_DAO]: (1 - activityNorm) * (0.3 + 0.7 * patience) * (1 - dragNorm * 0.35),
            [SIX_PATHS.REN_DAO]: 0.55 + (1 - Math.abs(activityNorm - 0.45)) * 0.45,
            [SIX_PATHS.XIU_LUO_DAO]: activityNorm * (1 - patience * 0.5) + dragNorm * 0.22 + dragIntensity * 0.08,
            [SIX_PATHS.CHU_SHENG_DAO]: chaos * (0.35 + activityNorm * 0.35) + dragNorm * 0.12,
            [SIX_PATHS.E_GUI_DAO]: (1 - activityNorm) * (1 - chaos) * (1 - Math.min(1, clicks)) * (1 - dragNorm * 0.4),
            [SIX_PATHS.DI_YU_DAO]: erratic * (0.5 + activityNorm * 0.5) + dragNorm * 0.18 * (0.5 + erratic),
        };
        let sum = 0;
        for (const k in raw) sum += raw[k];
        if (sum <= 0) sum = 1;
        const out = {};
        for (const k in raw) out[k] = raw[k] / sum;
        return out;
    }

    function scorePaths(hasMarket, pathTimeRatio, userBias) {
        const ids = [
            SIX_PATHS.TIAN_DAO,
            SIX_PATHS.REN_DAO,
            SIX_PATHS.XIU_LUO_DAO,
            SIX_PATHS.CHU_SHENG_DAO,
            SIX_PATHS.E_GUI_DAO,
            SIX_PATHS.DI_YU_DAO,
        ];
        const alpha = 0.45;
        const scores = {};
        let bestPathId = SIX_PATHS.REN_DAO;
        let bestScore = -1;

        if (!hasMarket && !userBias) {
            return { pathId: bestPathId, scores: scores, bestScore: 0 };
        }

        for (let i = 0; i < ids.length; i++) {
            const key = ids[i];
            const marketPart = pathTimeRatio[key] || 0;
            const userPart = userBias && userBias[key] != null ? userBias[key] : 0;
            const score = hasMarket && userBias
                ? marketPart + alpha * userPart
                : userBias
                    ? userPart
                    : marketPart;
            scores[key] = score;
            if (score > bestScore) {
                bestScore = score;
                bestPathId = key;
            }
        }
        return { pathId: bestPathId, scores: scores, bestScore: bestScore };
    }

    /**
     * 不结束会话，按与 finalize 相同的市场停留 + 交互偏好打分，取出当前领先的道。
     * 供「受」在业力结算前选择苦/乐/舍。
     */
    function peekLeadingPath(userInteractionSummary) {
        if (!sessionState.timeInPath) {
            const cfg0 = PATH_CONFIG[SIX_PATHS.REN_DAO];
            return {
                pathId: SIX_PATHS.REN_DAO,
                name: cfg0.name,
                pathTimeRatio: {},
                totalTime: 0,
            };
        }
        const hasMarket = sessionState.active && sessionState.totalTime > 0;
        const totalTime = sessionState.totalTime || 0;
        const pathTimeRatio = {};
        for (const key in sessionState.timeInPath) {
            const t = sessionState.timeInPath[key];
            pathTimeRatio[key] = totalTime > 0 ? t / totalTime : 0;
        }

        const userBias = userInteractionSummary
            ? userSummaryToPathBias(userInteractionSummary)
            : null;

        const scored = scorePaths(hasMarket, pathTimeRatio, userBias);

        const cfg = PATH_CONFIG[scored.pathId] || PATH_CONFIG[SIX_PATHS.REN_DAO];
        return {
            pathId: scored.pathId,
            name: cfg.name,
            pathTimeRatio: pathTimeRatio,
            totalTime: totalTime,
        };
    }

    /**
     * 仅按市场停留最长的道（与面板六条杠最高柱一致），不混入交互偏好。
     */
    function peekDominantMarketPath() {
        if (!sessionState.timeInPath) {
            const cfg0 = PATH_CONFIG[SIX_PATHS.REN_DAO];
            return { pathId: SIX_PATHS.REN_DAO, name: cfg0.name };
        }
        let bestPathId = SIX_PATHS.REN_DAO;
        let bestT = -1;
        for (const key in sessionState.timeInPath) {
            const t = sessionState.timeInPath[key] || 0;
            if (t > bestT) {
                bestT = t;
                bestPathId = key;
            }
        }
        const cfg = PATH_CONFIG[bestPathId] || PATH_CONFIG[SIX_PATHS.REN_DAO];
        return { pathId: bestPathId, name: cfg.name };
    }

    /**
     * 会话结束时的最终归类
     * 可选传入 userInteractionSummary（交互采集器 getSummary()），与市场停留占比结合决定最终道
     * @param {{ clickCount: number, moveDistance: number, scrollDelta: number, wheelDelta: number, dragCount: number, dragDistance: number, dragDuration: number, dwellSeconds: number } | null} userInteractionSummary
     * @returns {Object|null} 最终六道 + 会话统计，无市场且无交互时返回 null
     */
    function finalizeSession(userInteractionSummary) {
        const hasMarket = sessionState.active && sessionState.totalTime > 0;
        const totalTime = sessionState.totalTime || 0;
        const pathTimeRatio = {};
        const timeInPath = sessionState.timeInPath || {
            [SIX_PATHS.TIAN_DAO]: 0,
            [SIX_PATHS.REN_DAO]: 0,
            [SIX_PATHS.XIU_LUO_DAO]: 0,
            [SIX_PATHS.CHU_SHENG_DAO]: 0,
            [SIX_PATHS.E_GUI_DAO]: 0,
            [SIX_PATHS.DI_YU_DAO]: 0,
        };
        for (const key in timeInPath) {
            const t = timeInPath[key];
            pathTimeRatio[key] = totalTime > 0 ? t / totalTime : 0;
        }

        const userBias = userInteractionSummary
            ? userSummaryToPathBias(userInteractionSummary)
            : null;

        const scored = scorePaths(hasMarket, pathTimeRatio, userBias);
        const bestPathId = scored.pathId;

        if (typeof console !== 'undefined' && console.info) {
            console.info('[SixPaths] finalize', bestPathId, {
                hasMarket: hasMarket,
                totalTime: totalTime,
                pathTimeRatio: pathTimeRatio,
                userBias: userBias,
                scores: scored.scores,
                interaction: userInteractionSummary || null,
            });
        }

        const finalPath = (function () {
            const cfg = PATH_CONFIG[bestPathId] || PATH_CONFIG[SIX_PATHS.REN_DAO];
            return {
                pathId: bestPathId,
                name: cfg.name,
                params: { ...cfg.params },
                colors: [...cfg.colors],
            };
        })();

        const Vol_avg = totalTime > 0 ? sessionState.sumVol / totalTime : 0;
        const Turn_avg = totalTime > 0 ? sessionState.sumTurn / totalTime : 0;
        const Stab_avg = totalTime > 0 ? sessionState.sumStab / totalTime : 0;

        sessionState.active = false;

        return {
            finalPath,
            avgMetrics: { Vol_avg, Turn_avg, Stab_avg },
            extremes: {
                maxVol: sessionState.maxVol,
                minTurn: sessionState.minTurn,
                minPriceChange24h: sessionState.minPriceChange24h,
            },
            timeInPath: { ...timeInPath },
            pathTimeRatio,
            totalTime,
            userInteractionSummary: userInteractionSummary || undefined,
            userPathBias: userBias || undefined,
        };
    }

    // ========== 7. 导出 ==========
    return {
        run,
        fetchFromCoinGecko,
        calcVolatility,
        calcTurnover,
        calcStability,
        determinePath,
        computeSemanticMetrics,
        SIX_PATHS,
        PATH_CONFIG,
        API,
        // 会话级接口
        startSession,
        tickSession,
        finalizeSession,
        getSessionSnapshot,
        // WebSocket / 盘口流专用入口
        tickFromStream,
        // 用户交互 -> 六道偏好（供 finalizeSession 内部使用，也可供调试）
        peekLeadingPath,
        peekDominantMarketPath,
        userSummaryToPathBias,
    };
})();

if (typeof window !== 'undefined') {
    window.SIX_PATHS_ALGORITHM = SIX_PATHS_ALGORITHM;
}
