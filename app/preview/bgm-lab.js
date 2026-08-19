(function () {
    'use strict';

    var TRACKS = [
        {
            id: 'mars',
            title: 'Mars',
            artist: 'Harry Gregson-Williams · The Martian',
            src: '../../assets/audio/mars.mp3',
            page: '',
            tags: ['current', 'tech', 'space'],
            blurb: '作品现用 BGM。需把合法文件放到 assets/audio/mars.mp3。',
            kind: 'music',
        },
        {
            id: 'cyberpunk-city',
            title: 'Cyberpunk City',
            artist: 'Alejandro Magaña',
            src: 'https://assets.mixkit.co/music/140/140.mp3',
            page: 'https://mixkit.co/free-stock-music/cyberpunk-city/',
            tags: ['tech', 'code'],
            blurb: '夜色电路、低频推进，偏代码/都市底层。',
            kind: 'music',
        },
        {
            id: 'digital-clouds',
            title: 'Digital Clouds',
            artist: 'Alejandro Magaña',
            src: 'https://assets.mixkit.co/music/175/175.mp3',
            page: 'https://mixkit.co/free-stock-music/digital-clouds/',
            tags: ['tech', 'code'],
            blurb: '轻合成器云层，适合数据面板、粒子漂浮。',
            kind: 'music',
        },
        {
            id: 'deep-techno',
            title: 'Deep Techno Ambience',
            artist: 'Alejandro Magaña',
            src: 'https://assets.mixkit.co/music/134/134.mp3',
            page: 'https://mixkit.co/free-stock-music/deep-techno-ambience/',
            tags: ['tech', 'dark'],
            blurb: '机械呼吸感，贴近协议/计算过程。',
            kind: 'music',
        },
        {
            id: 'sci-fi-score',
            title: 'Sci-Fi Score',
            artist: 'Arulo',
            src: 'https://assets.mixkit.co/music/464/464.mp3',
            page: 'https://mixkit.co/free-stock-music/sci-fi-score/',
            tags: ['tech', 'space'],
            blurb: '短科幻配乐，偏 HUD / 扫描。',
            kind: 'music',
        },
        {
            id: 'hazy-after-hours',
            title: 'Hazy After Hours',
            artist: 'Alejandro Magaña',
            src: 'https://assets.mixkit.co/music/132/132.mp3',
            page: 'https://mixkit.co/free-stock-music/hazy-after-hours/',
            tags: ['tech', 'dark'],
            blurb: '深夜霓虹，比 Cyberpunk City 更闷、更贴地狱道。',
            kind: 'music',
        },
        {
            id: 'dark-shadows',
            title: 'Dark Shadows',
            artist: 'Ahjay Stelino',
            src: 'https://assets.mixkit.co/music/64/64.mp3',
            page: 'https://mixkit.co/free-stock-music/dark-shadows/',
            tags: ['dark'],
            blurb: '压迫感阴影，适合业力结算前。',
            kind: 'music',
        },
        {
            id: 'echoes',
            title: 'Echoes',
            artist: 'Andrew Ev',
            src: 'https://assets.mixkit.co/music/188/188.mp3',
            page: 'https://mixkit.co/free-stock-music/echoes/',
            tags: ['dark', 'space'],
            blurb: '长氛围 drone，接近现用 Mars 的空。',
            kind: 'music',
        },
        {
            id: 'vastness',
            title: 'Vastness',
            artist: 'Andrew Ev',
            src: 'https://assets.mixkit.co/music/184/184.mp3',
            page: 'https://mixkit.co/free-stock-music/vastness/',
            tags: ['space', 'dark'],
            blurb: '宇宙尺度，适合星云底与房屋点云。',
            kind: 'music',
        },
        {
            id: 'xanthos',
            title: 'Xanthos',
            artist: 'Eugenio Mininni',
            src: 'https://assets.mixkit.co/music/633/633.mp3',
            page: 'https://mixkit.co/free-stock-music/xanthos/',
            tags: ['space', 'tech'],
            blurb: '近 5 分钟科幻铺底，可当全片床。',
            kind: 'music',
        },
        {
            id: 'voxscape',
            title: 'Voxscape',
            artist: 'Eugenio Mininni',
            src: 'https://assets.mixkit.co/music/571/571.mp3',
            page: 'https://mixkit.co/free-stock-music/voxscape/',
            tags: ['sacred', 'shaman', 'space'],
            blurb: '人声垫铺成圣咏，科技里带仪式。',
            kind: 'music',
        },
        {
            id: 'spiritual-moment',
            title: 'Spiritual Moment',
            artist: 'Diego Nava',
            src: 'https://assets.mixkit.co/music/525/525.mp3',
            page: 'https://mixkit.co/free-stock-music/spiritual-moment/',
            tags: ['sacred', 'shaman'],
            blurb: '更直白的宗教时刻，可贴金刚经段落。',
            kind: 'music',
        },
        {
            id: 'forever-sinner',
            title: 'Forever a Sinner',
            artist: 'Michael Ramir C.',
            src: 'https://assets.mixkit.co/music/904/904.mp3',
            page: 'https://mixkit.co/free-stock-music/forever-a-sinner/',
            tags: ['sacred', 'shaman', 'dark'],
            blurb: '罪与救赎，贴六道判定。',
            kind: 'music',
        },
        {
            id: 'unforgiven',
            title: 'Unforgiven',
            artist: 'Michael Ramir C.',
            src: 'https://assets.mixkit.co/music/890/890.mp3',
            page: 'https://mixkit.co/free-stock-music/unforgiven/',
            tags: ['sacred', 'shaman', 'dark'],
            blurb: '更冷的宗教感，少赞美、多审判。',
            kind: 'music',
        },
        {
            id: 'jungle-voices',
            title: 'Jungle Voices',
            artist: 'Diego Nava',
            src: 'https://assets.mixkit.co/music/517/517.mp3',
            page: 'https://mixkit.co/free-stock-music/jungle-voices/',
            tags: ['sacred', 'shaman'],
            blurb: '仪式人声，偏原始崇拜而非教堂。',
            kind: 'music',
        },
        {
            id: 'how-chant',
            title: 'How',
            artist: 'Eugenio Mininni',
            src: 'https://assets.mixkit.co/music/579/579.mp3',
            page: 'https://mixkit.co/free-stock-music/gregorian-chant/',
            tags: ['sacred', 'shaman'],
            blurb: '格里高利圣咏骨架，赛博宗教的人声底座。',
            kind: 'music',
        },
        {
            id: 'kodama-night-town',
            title: 'Kodama Night Town',
            artist: 'Alejandro Magaña',
            src: 'https://assets.mixkit.co/music/114/114.mp3',
            page: 'https://mixkit.co/free-stock-music/kodama-night-town/',
            tags: ['sacred', 'shaman', 'dark'],
            blurb: '夜镇里的木灵，电子雾气裹着民俗仪式。',
            kind: 'music',
        },
        {
            id: 'spirit-woods',
            title: 'Spirit in the Woods',
            artist: 'Alejandro Magaña',
            src: 'https://assets.mixkit.co/music/139/139.mp3',
            page: 'https://mixkit.co/free-stock-music/spirit-in-the-woods/',
            tags: ['sacred', 'shaman'],
            blurb: '林中精灵，萨满出场、点云呼吸可用。',
            kind: 'music',
        },
        {
            id: 'spirit-woods-2',
            title: 'Spirit in the Woods 2',
            artist: 'Alejandro Magaña',
            src: 'https://assets.mixkit.co/music/147/147.mp3',
            page: 'https://mixkit.co/free-stock-music/spirit-in-the-woods/',
            tags: ['sacred', 'shaman'],
            blurb: '同系列更空的一版，贴近相位振荡。',
            kind: 'music',
        },
        {
            id: 'indian-meditations',
            title: 'Indian Meditations',
            artist: 'Ahjay Stelino',
            src: 'https://assets.mixkit.co/music/21/21.mp3',
            page: 'https://mixkit.co/free-stock-music/indian-meditations/',
            tags: ['sacred', 'shaman'],
            blurb: '坐禅/持咒感，赛博宗教里的东方仪轨。',
            kind: 'music',
        },
        {
            id: 'nield-hanging-1',
            title: 'Nield Grohm Hanging 1',
            artist: 'Eugenio Mininni',
            src: 'https://assets.mixkit.co/music/538/538.mp3',
            page: 'https://mixkit.co/free-stock-music/nield-grohm-hanging-1/',
            tags: ['sacred', 'shaman', 'tech'],
            blurb: '悬挂仪典，合成器像祭器在空中晃。',
            kind: 'music',
        },
        {
            id: 'nield-hanging-2',
            title: 'Nield Grohm Hanging 2',
            artist: 'Eugenio Mininni',
            src: 'https://assets.mixkit.co/music/539/539.mp3',
            page: 'https://mixkit.co/free-stock-music/nield-grohm-hanging-2/',
            tags: ['sacred', 'shaman', 'tech'],
            blurb: '同仪式第二态，更冷、更协议。',
            kind: 'music',
        },
        {
            id: 'nield-hanging-3',
            title: 'Nield Grohm Hanging 3',
            artist: 'Eugenio Mininni',
            src: 'https://assets.mixkit.co/music/540/540.mp3',
            page: 'https://mixkit.co/free-stock-music/nield-grohm-hanging-3/',
            tags: ['sacred', 'shaman', 'dark'],
            blurb: '第三态，暗部加重，可贴地狱/审判。',
            kind: 'music',
        },
        {
            id: 'nield-hanging-4',
            title: 'Nield Grohm Hanging 4',
            artist: 'Eugenio Mininni',
            src: 'https://assets.mixkit.co/music/541/541.mp3',
            page: 'https://mixkit.co/free-stock-music/nield-grohm-hanging-4/',
            tags: ['sacred', 'shaman', 'space'],
            blurb: '第四态，仪式被拉到宇宙尺度。',
            kind: 'music',
        },
        {
            id: 'gold-virginia',
            title: 'Gold Virginia',
            artist: 'Eugenio Mininni',
            src: 'https://assets.mixkit.co/music/578/578.mp3',
            page: 'https://mixkit.co/free-stock-music/gold-virginia/',
            tags: ['sacred', 'shaman', 'space'],
            blurb: '鎏金圣物感，科技祭坛的光。',
            kind: 'music',
        },
        {
            id: 'cancion-de-crystal',
            title: 'Cancion de Crystal',
            artist: 'Eugenio Mininni',
            src: 'https://assets.mixkit.co/music/583/583.mp3',
            page: 'https://mixkit.co/free-stock-music/cancion-de-crystal/',
            tags: ['sacred', 'shaman', 'space'],
            blurb: '晶体圣歌，近 5 分钟，可当全片第二床。',
            kind: 'music',
        },
        {
            id: 'forest-treasure',
            title: 'Forest Treasure',
            artist: 'Alejandro Magaña',
            src: 'https://assets.mixkit.co/music/138/138.mp3',
            page: 'https://mixkit.co/free-stock-music/forest-treasure/',
            tags: ['sacred', 'shaman'],
            blurb: '林藏宝物，民俗电子、偏萨满拾遗。',
            kind: 'music',
        },
        {
            id: 'valley-sunset',
            title: 'Valley Sunset',
            artist: 'Alejandro Magaña',
            src: 'https://assets.mixkit.co/music/127/127.mp3',
            page: 'https://mixkit.co/free-stock-music/valley-sunset/',
            tags: ['sacred', 'shaman'],
            blurb: '谷地黄昏，仪式开始前的天光。',
            kind: 'music',
        },
        {
            id: 'zanarkand-forest',
            title: 'Zanarkand Forest',
            artist: 'Alejandro Magaña',
            src: 'https://assets.mixkit.co/music/169/169.mp3',
            page: 'https://mixkit.co/free-stock-music/zanarkand-forest/',
            tags: ['sacred', 'shaman', 'space'],
            blurb: '遗迹森林，神殿废墟走点云。',
            kind: 'music',
        },
        {
            id: 'forest-mist-whispers',
            title: 'Forest Mist Whispers',
            artist: 'Alejandro Magaña',
            src: 'https://assets.mixkit.co/music/148/148.mp3',
            page: 'https://mixkit.co/free-stock-music/forest-mist-whispers/',
            tags: ['sacred', 'shaman', 'dark'],
            blurb: '雾里低语，像协议在林中诵经。',
            kind: 'music',
        },
        {
            id: 'silent-descent',
            title: 'Silent Descent',
            artist: 'Eugenio Mininni',
            src: 'https://assets.mixkit.co/music/614/614.mp3',
            page: 'https://mixkit.co/free-stock-music/silent-descent/',
            tags: ['sacred', 'shaman', 'dark'],
            blurb: '无声下降，业力条走完、入六道可用。',
            kind: 'music',
        },
        {
            id: 'cyberpunk-city-2',
            title: 'Cyberpunk City 2',
            artist: 'Alejandro Magaña',
            src: 'https://assets.mixkit.co/music/141/141.mp3',
            page: 'https://mixkit.co/free-stock-music/cyberpunk-city-2/',
            tags: ['tech', 'shaman', 'dark'],
            blurb: '夜城第二态：电路当香火，都市里的赛博祭祀。',
            kind: 'music',
        },
        {
            id: 'opalescent',
            title: 'Opalescent',
            artist: 'Eugenio Mininni',
            src: 'https://assets.mixkit.co/music/593/593.mp3',
            page: 'https://mixkit.co/free-stock-music/opalescent/',
            tags: ['space', 'sacred', 'shaman'],
            blurb: '乳白光晕，适合识 / 名色溶解。',
            kind: 'music',
        },
        {
            id: 'choir-glitch',
            title: 'Chill Choir Glitchy Suspense',
            artist: 'Mixkit SFX',
            src: 'https://assets.mixkit.co/active_storage/sfx/687/687-preview.mp3',
            page: 'https://mixkit.co/free-sound-effects/chill-choir-glitchy-suspense/',
            tags: ['sacred', 'shaman', 'code', 'sting'],
            blurb: '圣咏被采样撕开，代码风 + 宗教风叠在一起。',
            kind: 'sting',
        },
        {
            id: 'dark-choir',
            title: 'Cinematic Dark Choir',
            artist: 'Mixkit SFX',
            src: 'https://assets.mixkit.co/active_storage/sfx/664/664-preview.mp3',
            page: 'https://mixkit.co/free-sound-effects/cinematic-dark-choir-transition/',
            tags: ['sacred', 'dark', 'sting'],
            blurb: '短暗合唱过渡，可做切六道的一声。',
            kind: 'sting',
        },
        {
            id: 'tech-choir',
            title: 'Tech Choir Riser',
            artist: 'Mixkit SFX',
            src: 'https://assets.mixkit.co/active_storage/sfx/794/794-preview.mp3',
            page: 'https://mixkit.co/free-sound-effects/tech-choir-cinematic-riser/',
            tags: ['tech', 'sacred', 'shaman', 'sting'],
            blurb: '科技 choir 抬升，进度条走完可用。',
            kind: 'sting',
        },
        {
            id: 'space-scape',
            title: 'Space Soundscape',
            artist: 'Mixkit SFX',
            src: 'https://assets.mixkit.co/active_storage/sfx/653/653-preview.mp3',
            page: 'https://mixkit.co/free-sound-effects/space-soundscape/',
            tags: ['space', 'sting'],
            blurb: '星云底噪，可垫在 BGM 下层。',
            kind: 'sting',
        },
    ];

    var FILTERS = [
        { id: 'all', label: '全部' },
        { id: 'current', label: '现用' },
        { id: 'tech', label: '科技 / 代码' },
        { id: 'sacred', label: '宗教 / 仪式' },
        { id: 'shaman', label: '赛博萨满' },
        { id: 'dark', label: '暗黑' },
        { id: 'space', label: '宇宙' },
        { id: 'sting', label: '短过渡' },
    ];

    var TAG_LABEL = {
        current: '现用',
        tech: '科技',
        code: '代码',
        sacred: '宗教',
        shaman: '萨满',
        dark: '暗黑',
        space: '宇宙',
        sting: '过渡',
    };

    var extras = [];
    var filter = 'all';
    var currentId = null;
    var looping = true;

    var audio = document.getElementById('bgmAudio');
    var grid = document.getElementById('bgmGrid');
    var filtersEl = document.getElementById('bgmFilters');
    var playBtn = document.getElementById('bgmPlay');
    var seek = document.getElementById('bgmSeek');
    var vol = document.getElementById('bgmVol');
    var loopBtn = document.getElementById('bgmLoop');
    var nowTitle = document.getElementById('bgmNowTitle');
    var nowSub = document.getElementById('bgmNowSub');
    var timeEl = document.getElementById('bgmTime');
    var srcLink = document.getElementById('bgmSrc');
    var fileInput = document.getElementById('bgmFile');
    var seeking = false;

    function allTracks() {
        return TRACKS.concat(extras);
    }

    function findTrack(id) {
        var list = allTracks();
        for (var i = 0; i < list.length; i++) {
            if (list[i].id === id) return list[i];
        }
        return null;
    }

    function matches(track) {
        if (filter === 'all') return true;
        return track.tags.indexOf(filter) !== -1;
    }

    function fmt(t) {
        if (!isFinite(t) || t < 0) return '0:00';
        var m = Math.floor(t / 60);
        var s = Math.floor(t % 60);
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    function renderFilters() {
        filtersEl.innerHTML = '';
        FILTERS.forEach(function (f) {
            var b = document.createElement('button');
            b.type = 'button';
            b.textContent = f.label;
            b.className = f.id === filter ? 'is-active' : '';
            b.addEventListener('click', function () {
                filter = f.id;
                renderFilters();
                renderGrid();
            });
            filtersEl.appendChild(b);
        });
    }

    function renderGrid() {
        grid.innerHTML = '';
        allTracks().filter(matches).forEach(function (track) {
            var card = document.createElement('button');
            card.type = 'button';
            card.className = 'bgm-card' + (track.id === currentId ? ' is-playing' : '');
            card.dataset.id = track.id;
            var kind = document.createElement('p');
            kind.className = 'bgm-card-kind';
            kind.textContent = track.kind === 'sting' ? 'Sting' : 'Instrumental';
            var h = document.createElement('h2');
            h.textContent = track.title;
            var a = document.createElement('p');
            a.textContent = track.artist;
            var b = document.createElement('p');
            b.textContent = track.blurb || '';
            var tags = document.createElement('div');
            tags.className = 'bgm-tags';
            track.tags.forEach(function (t) {
                var s = document.createElement('span');
                s.textContent = TAG_LABEL[t] || t;
                tags.appendChild(s);
            });
            card.appendChild(kind);
            card.appendChild(h);
            card.appendChild(a);
            if (track.blurb) card.appendChild(b);
            card.appendChild(tags);
            card.addEventListener('click', function () { playTrack(track.id); });
            grid.appendChild(card);
        });
    }

    function markPlaying() {
        var cards = grid.querySelectorAll('.bgm-card');
        for (var i = 0; i < cards.length; i++) {
            cards[i].classList.toggle('is-playing', cards[i].dataset.id === currentId);
        }
    }

    function playTrack(id) {
        var track = findTrack(id);
        if (!track) return;
        currentId = id;
        audio.loop = looping && track.kind !== 'sting';
        if (audio.src !== track.src) audio.src = track.src;
        audio.volume = Number(vol.value) / 100;
        audio.play().catch(function (err) {
            nowSub.textContent = '无法播放：检查网络或本地文件。' + (err && err.message ? ' ' + err.message : '');
        });
        nowTitle.textContent = track.title;
        nowSub.textContent = track.artist;
        srcLink.href = track.page || track.src;
        srcLink.hidden = !track.page && !track.src;
        playBtn.textContent = 'Pause';
        markPlaying();
    }

    function togglePlay() {
        if (!currentId) {
            playTrack(allTracks()[0].id);
            return;
        }
        if (audio.paused) {
            audio.play();
            playBtn.textContent = 'Pause';
        } else {
            audio.pause();
            playBtn.textContent = 'Play';
        }
    }

    audio.addEventListener('timeupdate', function () {
        if (seeking) return;
        var d = audio.duration || 0;
        seek.value = d ? Math.round((audio.currentTime / d) * 1000) : 0;
        timeEl.textContent = fmt(audio.currentTime) + ' / ' + fmt(d);
    });
    audio.addEventListener('ended', function () {
        playBtn.textContent = 'Play';
    });
    audio.addEventListener('pause', function () {
        if (audio.ended) return;
        playBtn.textContent = 'Play';
    });
    audio.addEventListener('play', function () {
        playBtn.textContent = 'Pause';
    });

    playBtn.addEventListener('click', togglePlay);
    seek.addEventListener('mousedown', function () { seeking = true; });
    seek.addEventListener('mouseup', function () { seeking = false; });
    seek.addEventListener('input', function () {
        var d = audio.duration || 0;
        if (d) audio.currentTime = (Number(seek.value) / 1000) * d;
    });
    vol.addEventListener('input', function () {
        audio.volume = Number(vol.value) / 100;
    });
    loopBtn.addEventListener('click', function () {
        looping = !looping;
        audio.loop = looping;
        loopBtn.classList.toggle('is-on', looping);
        loopBtn.setAttribute('aria-pressed', looping ? 'true' : 'false');
    });
    loopBtn.classList.add('is-on');

    function addLocalFiles(files) {
        Array.prototype.forEach.call(files, function (file) {
            if (!file || file.type.indexOf('audio') !== 0) return;
            extras.push({
                id: 'local-' + file.name + '-' + file.size,
                title: file.name.replace(/\.[^.]+$/, ''),
                artist: '本地文件',
                src: URL.createObjectURL(file),
                page: '',
                tags: ['current'],
                blurb: '拖入对比用，不会写入仓库。',
                kind: 'music',
            });
        });
        renderGrid();
    }

    fileInput.addEventListener('change', function () {
        addLocalFiles(fileInput.files);
    });
    document.addEventListener('dragover', function (e) {
        e.preventDefault();
    });
    document.addEventListener('drop', function (e) {
        e.preventDefault();
        if (e.dataTransfer && e.dataTransfer.files) addLocalFiles(e.dataTransfer.files);
    });
    document.addEventListener('keydown', function (e) {
        if (e.code === 'Space' && e.target === document.body) {
            e.preventDefault();
            togglePlay();
        }
    });

    audio.volume = 0.7;
    renderFilters();
    renderGrid();
})();
