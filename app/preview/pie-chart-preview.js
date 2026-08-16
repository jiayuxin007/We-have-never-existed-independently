(function (global) {
    'use strict';

    var Pie = global.KarmaPieChart;
    var Bar = global.KarmaBarChart;
    var heroSvg = document.getElementById('heroPie');
    var heroBar = document.getElementById('heroBar');
    var heroLegend = document.getElementById('heroLegend');
    var heroSubtitle = document.getElementById('heroSubtitle');
    var galleryGrid = document.getElementById('galleryGrid');
    var mode = 'live';
    var variant = Pie.DEFAULT_VARIANT || 'orbital';
    var tick = 0;
    var timer = null;
    var currentPayload = null;

    var BAR_LABEL = 'Bar · 六道横条';

    var SAMPLE_LIVE = {
        tian: 0.08,
        ren: 0.34,
        xiuluo: 0.18,
        chusheng: 0.12,
        egui: 0.14,
        diyu: 0.14,
    };

    var SAMPLE_FINAL = {
        ratios: {
            tian: 0.06,
            ren: 0.41,
            xiuluo: 0.15,
            chusheng: 0.11,
            egui: 0.13,
            diyu: 0.14,
        },
        highlightId: 'ren',
        title: 'Final Path',
        subtitle: '人道 · Dynamic_Balance',
        centerPrimary: '人道',
        centerSecondary: 'Dynamic_Balance',
    };

    function isBarMode() {
        return variant === 'bar';
    }

    function jitterRatios(base) {
        var out = {};
        var sum = 0;
        Pie.PATH_ORDER.forEach(function (id) {
            var v = Math.max(0.02, (base[id] || 0) + (Math.random() - 0.5) * 0.06);
            out[id] = v;
            sum += v;
        });
        Pie.PATH_ORDER.forEach(function (id) {
            out[id] /= sum;
        });
        return out;
    }

    function chartOptions(payload, v) {
        return {
            variant: v || variant,
            chartType: (v || variant) === 'bar' ? 'bar' : 'pie',
            highlightId: payload.highlightId || null,
            centerPrimary: payload.centerPrimary || null,
            centerSecondary: payload.centerSecondary || null,
        };
    }

    function syncHeroVisibility() {
        var bar = isBarMode();
        if (heroSvg) heroSvg.hidden = bar;
        if (heroBar) heroBar.hidden = !bar;
        if (heroLegend) heroLegend.hidden = bar;
    }

    function paintHero(payload) {
        syncHeroVisibility();
        var opts = chartOptions(payload);

        if (isBarMode()) {
            Bar.renderBarEl(heroBar, payload.ratios || null, opts);
            if (Bar.replayIconVideos) Bar.replayIconVideos();
        } else {
            Pie.renderPieSvg(heroSvg, payload.ratios || null, opts);
            Pie.renderLegendEl(heroLegend, payload.ratios || null, payload.highlightId || null, { layout: 'pills' });
        }

        if (heroSubtitle) {
            var suffix = isBarMode() ? BAR_LABEL : (Pie.VARIANT_LABELS[variant] || variant);
            heroSubtitle.textContent = (payload.subtitle || '') + ' · ' + suffix;
        }
    }

    function paintPanel(payload) {
        var panelPayload = Object.assign({}, payload, chartOptions(payload));
        if (isBarMode()) panelPayload.chartType = 'pie';
        global.KarmaDataPanel.showDemo(panelPayload);
    }

    function paintGallery(payload) {
        if (!galleryGrid) return;
        galleryGrid.innerHTML = '';

        if (isBarMode()) {
            var barCard = document.createElement('article');
            barCard.className = 'pie-preview-card pie-preview-card-bar is-selected';

            var barLabel = document.createElement('h3');
            barLabel.className = 'pie-preview-card-label';
            barLabel.textContent = BAR_LABEL;

            var barHost = document.createElement('div');
            barHost.className = 'karma-path-bar-chart';

            barCard.appendChild(barLabel);
            barCard.appendChild(barHost);
            galleryGrid.appendChild(barCard);
            Bar.renderBarEl(barHost, payload.ratios || null, chartOptions(payload));
            return;
        }

        Pie.VARIANTS.forEach(function (v) {
            var card = document.createElement('article');
            card.className = 'pie-preview-card' + (v === variant ? ' is-selected' : '');

            var label = document.createElement('h3');
            label.className = 'pie-preview-card-label';
            label.textContent = Pie.VARIANT_LABELS[v] || v;

            var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('viewBox', '0 0 200 200');
            svg.setAttribute('class', 'karma-panel-pie pie-preview-card-pie');
            svg.setAttribute('role', 'img');

            card.appendChild(label);
            card.appendChild(svg);
            card.addEventListener('click', function () {
                setVariant(v);
            });
            galleryGrid.appendChild(card);

            Pie.renderPieSvg(svg, payload.ratios || null, chartOptions(payload, v));
        });
    }

    function paintAll(payload) {
        currentPayload = payload;
        paintHero(payload);
        paintPanel(payload);
        paintGallery(payload);
    }

    function tickLive() {
        tick += 1;
        var ratios = jitterRatios(SAMPLE_LIVE);
        var sec = 40 + tick * 3;
        paintAll({
            title: 'Path Time Ratio',
            subtitle: 'Live · session ' + sec + 's',
            ratios: ratios,
            centerPrimary: sec + 's',
            centerSecondary: 'live',
        });
    }

    function showEmpty() {
        paintAll({
            title: 'Path Time Ratio',
            subtitle: 'Waiting for market ticks…',
            ratios: null,
        });
    }

    function showFinal() {
        paintAll(SAMPLE_FINAL);
    }

    function setMode(next) {
        mode = next;
        document.querySelectorAll('.pie-preview-controls button').forEach(function (btn) {
            btn.classList.toggle('is-active', btn.getAttribute('data-mode') === mode);
        });
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
        if (mode === 'live') {
            tick = 0;
            tickLive();
            timer = setInterval(tickLive, 1800);
        } else if (mode === 'final') {
            showFinal();
        } else {
            showEmpty();
        }
    }

    function setVariant(next) {
        variant = next;
        document.querySelectorAll('.pie-preview-style-nav button').forEach(function (btn) {
            btn.classList.toggle('is-active', btn.getAttribute('data-variant') === variant);
        });
        if (currentPayload) {
            paintHero(currentPayload);
            paintPanel(currentPayload);
            paintGallery(currentPayload);
        }
    }

    global.KarmaDataPanel.init({ showImmediately: true });
    setMode('live');

    document.querySelectorAll('.pie-preview-controls button').forEach(function (btn) {
        btn.addEventListener('click', function () {
            setMode(btn.getAttribute('data-mode'));
        });
    });

    document.querySelectorAll('.pie-preview-style-nav button').forEach(function (btn) {
        btn.addEventListener('click', function () {
            setVariant(btn.getAttribute('data-variant'));
        });
    });
})(window);
