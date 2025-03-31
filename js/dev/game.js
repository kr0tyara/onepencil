var res,
    settings,
    loc,
    battle;

const   IDLE = 0,
        PRE_ATTACK = 1,
        ATTACK = 2,
        POST_ATTACK = 3,
        OWN_ATTACK = 4,
        ACT = 5,
        ITEMS = 6,
        DRAW = 7,
        DEAL = 8,
        GAME_OVER = 9,
        INTRO = 10,
        CREDITS = 11,
        
        STATE_NORMAL = 0,
        STATE_HURT = 1,
        STATE_ATTACKING = 2,
        STATE_HANGING = 3,
        STATE_DEAD = 4,
        STATE_DRAW = 6,
        STATE_BYE = 7,
        STATE_SHIELDING = 8,
        STATE_UNSHIELDING = 9,
        STATE_BREAK = 10,

        EFFECT_NONE = 0,
        EFFECT_DRAWING_TIME = 1,
        EFFECT_INVINSIBILITY = 2,

        TEXT_COLORS = [
            '#000000',
            '#ff0000',
            '#ff6a00',
            '#ffffff',
            '#0d85f3'
        ];


class Sheet
{
    constructor(_img, _json)
    {
        this.imgReady = false;
        this.imgUrl = _img;
        
        this.img = new Image();
        this.img.src = this.imgUrl;
        this.img.onload = this.OnImageLoad.bind(this);
        this.img.onerror = this.Error.bind(this);


        this.jsonReady = false;
        this.jsonUrl = _json;

        this.json = {};
        this.LoadJSON(this.jsonUrl);

        this.onload = null;
        this.onerror = null;
    }

    LoadJSON(_url)
    {
        let file = new XMLHttpRequest();
        file.overrideMimeType('application/json');
        file.open('GET', _url, true);
        file.onreadystatechange = () =>
        {
            if(file.readyState == 4)
            {
                if(file.status == 200)
                {
                    this.json = JSON.parse(file.responseText);
                    this.OnJSONLoad();
                }
                else
                    this.Error();
            }
        }
        file.onerror = this.Error;
        file.send();
    }

    OnImageLoad(e)
    {
        this.imgReady = true;
        this.AddReadyState();

        this.img.onload = null;
        this.img.onerror = null;
    }
    OnJSONLoad(e)
    {
        this.jsonReady = true;
        this.AddReadyState();

        this.parts = {};
        for(let i in this.json.frames)
        {
            let frame = this.json.frames[i];

            let split = i.split('_');
            let name = split.slice(0, split.length - 1).join('_');

            if(this.parts[name])
                this.parts[name].push(frame);
            else
                this.parts[name] = [frame];
        }
    }
    GetTagFrame(_tag)
    {
        let frames = this.GetTagFrames(_tag);

        if(frames == null)
            return null;

        return frames[0];
    }
    GetTagFrames(_tag)
    {
        let data = this.json.meta.frameTags.filter(i => i.name == _tag);
        
        if(data.length == 0)
            return null;

        let arr = [];
        for(let i = data[0].from; i <= data[0].to; i++)
            arr.push(i);

        return arr;
    }

    Error(e)
    {
        if(this.onerror)
            this.onerror();
    }

    Reload()
    {
        if(!this.imgReady)
            this.img.src = this.imgUrl + `?retry=${Date.now()}`;

        if(!this.jsonReady)
            this.LoadJSON(this.jsonUrl + `?retry=${Date.now()}`);
    }

    AddReadyState()
    {
        if(this.imgReady && this.jsonReady)
        {
            if(this.onload)
                this.onload();
        }
    }

    DrawColored(_ctx, _tmp, _part, _frame, _x, _y, _c, _w = -1, _h = -1, _centerX = false, _centerY = false, _rotation = 0)
    {
        let part = this.parts[_part];

        if(part == null || _frame >= part.length)
            return;

        let frame = part[_frame].frame;
        let w = _w > 0 ? _w : frame.w;
        let h = _h > 0 ? _h : frame.h;
        
        _tmp.canvas.width  = w;
        _tmp.canvas.height = h;

        if(_centerX)
            _x -= w / 2;
        else
            _x += part[_frame].spriteSourceSize.x;
        
        if(_centerY)
            _y -= h / 2;
        else if(!_centerY)
            _y += part[_frame].spriteSourceSize.y;

        _tmp.fillStyle = _c;

        _tmp.drawImage(this.img, frame.x, frame.y, frame.w, frame.h, 0, 0, w, h);
        _tmp.globalCompositeOperation = 'source-in';
        _tmp.fillRect(0, 0, w, h);
        _tmp.globalCompositeOperation = 'source-over';

        _ctx.save();
        _ctx.translate(_x + w / 2, _y + h / 2);
        _ctx.rotate(_rotation);
        _ctx.drawImage(_tmp.canvas, -w / 2, -h / 2, w, h);
        _ctx.restore();
    }

    Draw(_ctx, _part, _frame, _x, _y, _w = -1, _h = -1, _centerX = false, _centerY = false, _rotation = 0, _ignoreOriginalPos = false)
    {
        let part = this.parts[_part];

        if(part == null || _frame >= part.length)
            return;

        let frame = part[_frame].frame;
        
        let w = _w > 0 ? _w : frame.w;
        let h = _h > 0 ? _h : frame.h;

        if(_centerX)
            _x -= w / 2;
        else if(!_ignoreOriginalPos)
            _x += part[_frame].spriteSourceSize.x;

        if(_centerY)
            _y -= h / 2;
        else if(!_ignoreOriginalPos)
            _y += part[_frame].spriteSourceSize.y;

        _ctx.save();
        _ctx.translate(_x + w / 2, _y + h / 2);
        _ctx.rotate(_rotation);
        _ctx.drawImage(this.img, frame.x, frame.y, frame.w, frame.h, -w / 2, -h / 2, w, h);
        _ctx.restore();
    }
}

class Sound
{
    constructor(_url, _volume, _speed, _loop, _music)
    {
        this.url = _url;
        this.volume = _volume;
        this.speed = _speed;
        this.loop = _loop;
        this.music = _music;
        this.ended = true;

        this.audio = new Audio(this.url);
        this.audio.volume = this.volume;
        this.audio.defaultPlaybackRate = this.speed;

        this.audio.onended = this.Ended.bind(this);
        
        this.audio.load();
        this.audio.oncanplaythrough = this.Load.bind(this);
        this.audio.onerror = this.Error.bind(this);

        this.onload = null;
        this.onerror = null;
    }

    Load()
    {
        if(this.onload)
            this.onload();
    }
    Error()
    {
        if(this.onerror)
            this.onerror();
    }
    Reload()
    {
        this.audio.src = this.url + `?retry=${Date.now()}`;
    }

    Ended()
    {
        this.ended = true;

        if(this.loop)
        {
            this.audio.currentTime = 0;
            this.audio.play();
        }
    }

    OnVolumeChange()
    {
        this.audio.volume = this.volume * (this.music ? settings.bgmVolume : settings.sfxVolume);
    }
    play()
    {
        if(!this.ended)
            return;
        
        this.audio.volume = this.volume * (this.music ? settings.bgmVolume : settings.sfxVolume);

        this.audio.currentTime = 0;
        this.audio.play();
        this.ended = false;
    }
    pause()
    {
        this.ended = true;
        this.audio.pause();
    }
}

class Locale
{
    constructor(_url)
    {
        this.url = _url;

        this.json = {};
        this.Load(this.url);

        this.onload = null;
        this.onerror = null;
    }

    GetString(_group, _reference)
    {
        if(this.json.groups[_group][_reference])
            return this.json.groups[_group][_reference];

        console.error(`нет строки: ${_reference} [${_group}]`);
        return _reference;
    }
    GetDialogue(_character, _reference)
    {
        if(this.json.dialogue[_character][_reference])
            return this.json.dialogue[_character][_reference];

        console.error(`нет диалога: ${_reference} [${_character}]`);
        return [_reference];
    }

    OnLoad(e)
    {
        if(this.onload)
            this.onload();
    }
    Error(e)
    {
        if(this.onerror)
            this.onerror()
    }

    Load(_url)
    {
        let file = new XMLHttpRequest();
        file.overrideMimeType('application/json');
        file.open('GET', _url, true);
        file.onreadystatechange = () =>
        {
            if(file.readyState == 4)
            {
                if(file.status == 200)
                {
                    this.json = JSON.parse(file.responseText);
                    this.OnLoad();
                }
                else
                    this.Error();
            }
        }
        file.onerror = this.Error;
        file.send();
    }

    Reload()
    {
        this.Load(this.url + `?retry=${Date.now()}`);
    }
}

class GameResources
{
    constructor()
    {
        this.spritePrefix = './img/';
        this.spriteData = {};
        this.sprites = {};
        this.spriteNames = 
        {
            icons: 'icons.png',
            buttons: 'buttons.png',
            actions: 'actions.png',
            items: 'items.png',
            effects: 'effects.png',

            soul: 'soul.png',
            soulbreak: 'soulbreak.png',
            
            ducky: 'ducky.png',
            minipencil: 'minipencil.png',

            card: 'card.png',
            pencils: 'pencils.png',
            scribble: 'scribble.png',
            eat: 'eat.png',
            chunks: 'chunks.png',
            star: 'star.png',
        };
        
        this.sheetPrefix = './img/sheet/';
        this.sheetData = {};
        this.sheets = {};
        this.sheetNames = 
        {
            duck: {
                img: 'duck.png',
                json: 'duck.json',
            },
            triangle: {
                img: 'triangle.png',
                json: 'triangle.json'
            },
            circle: {
                img: 'circle.png',
                json: 'circle.json'
            },
            star: {
                img: 'star.png',
                json: 'star.json'
            },
            patterns: {
                img: 'patterns.png',
                json: 'patterns.json'
            },
            popsicle: {
                img: 'popsicle.png',
                json: 'popsicle.json'
            },
            promo1: {
                img: 'promo1.png',
                json: 'promo1.json'
            },
            promo2: {
                img: 'promo2.png',
                json: 'promo2.json'
            },
            hands: {
                img: 'hands.png',
                json: 'hands.json'
            },
            story: {
                img: 'story.png',
                json: 'story.json'
            },
            ending: {
                img: 'ending.png',
                json: 'ending.json'
            }
        };

        this.sfxPrefix = './sfx/';
        this.sfxData = {};
        this.sfx = {};
        this.sfxNames = 
        {
            intro: {
                url: 'intro.mp3',
                music: true
            },
            bgm: {
                url: 'DUCKIDK2.mp3',
                loop: true,
                volume: 0.7,
                music: true,
            },
            bgmGeno: {
                url: 'DUCKGENO.mp3',
                loop: true,
                volume: 0.7,
                music: true,
            },
            fail: {
                url: 'fail.mp3',
                music: true
            },
            check: {
                url: 'check.mp3',
                volume: 0.8,
            },
            duck: {
                url: 'duck.mp3',
                volume: 1
            },
            other:
            {
                url: 'other.mp3',
                volume: .7
            },
            hurt: {
                url: 'hurt.mp3',
                volume: 0.6
            },
            hurt2: {
                url: 'hurt2.mp3',
                volume: 0.6
            },
            death: {
                url: 'death.mp3',
                volume: 0.6
            },
            circle1: {
                url: 'circle_1.mp3',
            },
            circle2: {
                url: 'circle_2.mp3',
            },
            triangle1: {
                url: 'triangle_1.mp3',
            },
            triangle2: {
                url: 'triangle_2.mp3',
            },
            star1: {
                url: 'star_1.mp3',
            },
            star2: {
                url: 'star_2.mp3',
            },
            click1:
            {
                url: 'jump.mp3',
            },
            click2:
            {
                url: 'jump2.mp3',
            },
            click3:
            {
                url: 'jump4.mp3',
            },
            scribble1:
            {
                url: 'scribble_1.mp3',
            },
            scribble2:
            {
                url: 'scribble_2.mp3',
            },
            tick:
            {
                url: 'tick.mp3',
            },
            hop:
            {
                url: 'hop.mp3',
                volume: .5,
            },
            hop2:
            {
                url: 'hop2.mp3',
                volume: .6,
            },
            crack:
            {
                url: 'crack.mp3',
                volume: .8,
            },
            break:
            {
                url: 'break.mp3',
                volume: .5,
            },
            warning:
            {
                url: 'warning.mp3',
                volume: .7
            },
            heal:
            {
                url: 'heal.mp3',
                volume: .8
            },
            effect:
            {
                url: 'effect.mp3',
                volume: .5
            },
            effectEnd:
            {
                url: 'effect_end.mp3',
                volume: .5
            },
            explosion:
            {
                url: 'explosion.mp3',
                volume: .5
            },
            chop:
            {
                url: 'chop.mp3',
            },
            vroom:
            {
                url: 'vroom.mp3',
            },
            gulp:
            {
                url: 'gulp.mp3',
            }
        };

        this.locPrefix = './locale/';
        this.locData = {};
        this.loc = {};
        this.locNames = {
            ru: 'ru.json',
            en: 'en.json',
        };

        this.ready = false;
        this.onReady = null;
        this.onProgress = null;
    }

    Load()
    {
        for(let i in this.spriteNames)
        {
            let sprite = this.spriteNames[i];

            let path;
            if(typeof sprite == 'string')
                path = this.spritePrefix + sprite;
            else
                path = this.spritePrefix + sprite.url;

            let img = new Image();
            img.src = path;

            this.spriteData[i] = 
            {
                url: path,
                src: img,
                loaded: false,
                tries: 0
            };
            this.sprites[i] = img;

            img.onload = () => this.OnLoad(i, 0);
            img.onerror = () => this.OnError(i, 0);
        }

        for(let i in this.sheetNames)
        {
            let sheet = this.sheetNames[i];
            let imgPath = this.sheetPrefix + sheet.img;
            let jsonPath = this.sheetPrefix + sheet.json;

            let s = new Sheet(imgPath, jsonPath);

            this.sheetData[i] = 
            {
                src: s,
                loaded: false,
                tries: 0
            };
            this.sheets[i] = s;

            s.onload = () => this.OnLoad(i, 2);
            s.onerror = () => this.OnError(i, 2);
        }

        for(let i in this.sfxNames)
        {
            let sfx = this.sfxNames[i];

            let path;
            let volume = 1;
            let speed = 1;
            let loop = false;
            let music = false;

            if(typeof sfx == 'string')
                path = this.sfxPrefix + sfx;
            else
            {
                path = this.sfxPrefix + sfx.url;
                volume = sfx.volume != null ? sfx.volume : 1;
                loop = sfx.loop != null ? sfx.loop : false;
                speed = sfx.speed != null ? sfx.speed : 1;
                music = sfx.music != null ? sfx.music : false;
            }

            let audio = new Sound(path, volume, speed, loop, music);
            this.sfxData[i] = 
            {
                url: path,
                src: audio,
                loaded: false,
                tries: 0
            };

            this.sfx[i] = audio;
            audio.onload = () => this.OnLoad(i, 1);
            audio.onerror = () => this.OnError(i, 1);
        }

        for(let i in this.locNames)
        {
            let locale = this.locNames[i];
            let path = this.locPrefix + locale;

            let l = new Locale(path);

            this.locData[i] = 
            {
                src: l,
                loaded: false,
                tries: 0
            };
            this.loc[i] = l;

            l.onload = () => this.OnLoad(i, 3);
            l.onerror = () => this.OnError(i, 3);
        }
    }

    OnError(i, _type)
    {
        let target;
        switch(_type)
        {
            case 0:
                target = this.spriteData[i];
                break;

            case 1:
                target = this.sfxData[i];
                break;

            case 2:
                target = this.sheetData[i];
                break;

            case 3:
                target = this.locData[i];
                break;
        }

        console.log(`${i} doesn't load (tries: ${target.tries})`);
        if(target.tries >= 3)
        {
            alert(`Ошибка при загрузке ресурса: ${i}`);
            return;
        }

        target.tries++;
        setTimeout(() => this.Reload(target, _type), 1000);
    }
    Reload(_target, _type)
    {
        if(_type == 0)
            _target.src.src = _target.url + `?retry=${Date.now()}`;
        else
            _target.src.Reload();
    }

    OnLoad(i, _type)
    {
        let target;
        switch(_type)
        {
            case 0:
                target = this.spriteData[i];
                break;

            case 1:
                target = this.sfxData[i];
                break;

            case 2:
                target = this.sheetData[i];
                break;

            case 3:
                target = this.locData[i];
                break;
        }

        target.loaded = true;
        target.src.onload = null;
        target.src.oncanplaythrough = null;
        target.src.onerror = null;

        let readyCount = 0;
        for(let i in this.spriteData)
        {
            if(this.spriteData[i].loaded)
                readyCount++;
        }
        for(let i in this.sfxData)
        {
            if(this.sfxData[i].loaded)
                readyCount++;
        }
        for(let i in this.sheetData)
        {
            if(this.sheetData[i].loaded)
                readyCount++;
        }
        for(let i in this.locData)
        {
            if(this.locData[i].loaded)
                readyCount++;
        }

        let totalLen = Object.keys(this.spriteData).length + Object.keys(this.sfxData).length + Object.keys(this.sheetData).length + Object.keys(this.locData).length;
        this.onProgress(readyCount / totalLen);
        if(readyCount == totalLen)
        {
            this.ready = true;

            if(this.onReady)
                this.onReady();
        }
    }

    OnVolumeChange(_bgm, _value)
    {
        for(let i in this.sfx)
        {
            this.sfx[i].OnVolumeChange();
        }
    }
}

class Utils
{
    static Random(_min, _max)
    {
        return Math.random() * (_max - _min) + _min;
    }
    static RandomRound(_min, _max)
    {
        return ~~(Math.random() * (_max - _min) + _min);
    }
    static RandomArray(_array)
    {
        let len = _array.length;
        return _array[this.RandomRound(0, len)];
    }

    static Clamp(_i, _min, _max)
    {
        return (_i < _min ? _min : (_i > _max ? _max : _i));
    }

    static MousePosDOM(e, _element)
    {
        let rect = _element.getBoundingClientRect();
    
        return {
            x: (e.clientX - rect.left) / (rect.right - rect.left),
            y: (e.clientY - rect.top)  / (rect.bottom - rect.top)
        };
    }

    static MousePos(e, _element)
    {
        let rect = _element.getBoundingClientRect();
    
        return {
            x: (e.clientX - rect.left) / (rect.right - rect.left) * _element.width,
            y: (e.clientY - rect.top)  / (rect.bottom - rect.top) * _element.height
        };
    }

    static LinearPos(_start, _end, t)
    {
        return {
            x: _start.x + (_end.x - _start.x) * t,
            y: _start.y + (_end.y - _start.y) * t,
        }
    }
    static CurvePos(_start, _end, _height, t)
    {
        return {
            x: _start.x + (_end.x - _start.x) * t,
            y: _start.y + (_end.y - _start.y) * t - 4 * _height * t * (1 - t),
        }
    }

    static Lerp(_a, _b, i)
    {
        return (1 - i) * _a + i * _b;
    }
    static Distance(_a, _b)
    {
        let d = {x: _a.x - _b.x, y: _a.y - _b.y};
        return Math.sqrt(d.x * d.x + d.y * d.y);
    }
    static BoundsEqual(_a, _b)
    {
        return  this.Distance({x: _a.x1, y: _a.y1}, {x: _b.x1, y: _b.y1}) <= 1 &&
                this.Distance({x: _a.x2, y: _a.y2}, {x: _b.x2, y: _b.y2}) <= 1;
    }
    static RotatePoint(_point, _center, _angle)
    {
        let cos = Math.cos(_angle);
        let sin = Math.sin(_angle);
    
        return {
            x: _center.x + (_point.x - _center.x) * cos - (_point.y - _center.y) * sin, 
            y: _center.y + (_point.x - _center.x) * sin + (_point.y - _center.y) * cos 
        };
    }

    static Quadratic(_min, _max, _index, _total)
    {
        let factor = ((_total - _index) / (_total - 1)) ** 2;
        return _max - factor * (_max - _min);
    }
    static ReverseQuadratic(_min, _max, _index, _total)
    {
        return this.Quadratic(_min, _max, _total - _index, _total);
    }

    static MaskSprite(_ctx, _temp, _img, _sx, _sy, _sw, _sh, _x, _y, _w, _h, _c)
    {
        _temp.canvas.width  = _w;
        _temp.canvas.height = _h;

        _temp.fillStyle = _c;

        _temp.drawImage(_img, _sx, _sy, _sw, _sh, 0, 0, _w, _h);
        _temp.globalCompositeOperation = 'source-in';
        _temp.fillRect(0, 0, _w, _h);
        _temp.globalCompositeOperation = 'source-over';

        _ctx.drawImage(_temp.canvas, _x, _y, _w, _h);
    }
    static RoundedRect(_ctx, _x, _y, _w, _h, _r)
    {
        if(_w < 2 * _r) _r = _w / 2;
        if(_h < 2 * _r) _r = _h / 2;
        _ctx.beginPath();
        _ctx.moveTo(_x + _r, _y);
        _ctx.arcTo(_x + _w, _y,   _x + _w, _y + _h, _r);
        _ctx.arcTo(_x + _w, _y + _h, _x,   _y + _h, _r);
        _ctx.arcTo(_x, _y + _h, _x, _y, _r);
        _ctx.arcTo(_x, _y, _x + _w, _y, _r);
        _ctx.closePath();
    }

    static SliceText(_ctx, _text, _bounds)
    {
        let newLines = [];

        for(let k in _text)
        {
            let ll = _text[k].split('~');
            for(let j in ll)
            {
                let words = ll[j].split(' ');

                let lines = [];
                let currentLine = words[0];
            
                for(let i = 1; i < words.length; i++)
                {
                    let word = words[i];
                    let width = _ctx.measureText(currentLine + ' ' + word).width;
                    if(_bounds.x1 + width < _bounds.x2)
                        currentLine += ' ' + word;
                    else
                    {
                        lines.push(currentLine);
                        currentLine = word;
                    }
                }

                lines.push(currentLine);
                ll[j] = lines.join('\n');
            }

            newLines.push(ll.join('~'));
        }

        return newLines;
    }

    static TextHeight(_ctx, _text, _textSize)
    {
        _ctx.font = `${_textSize}px Pangolin`;
        _ctx.textBaseline = 'top';

        let lines = _text.split(/\~|\n/).filter(a => a);

        let metrics = _ctx.measureText(_text);
        let h = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;

        return h * lines.length;
    }

    static GetAnimationFrame(_dt, _framerate, _frames)
    {
        return _frames[Math.round(_dt / _framerate) % _frames.length];
    }
}

class Settings
{
    constructor()
    {
        this.opened = false;

        this.sfxVolume      = (localStorage.getItem('promoduck_sfx_volume') != null ? localStorage.getItem('promoduck_sfx_volume') / 100 : 1);
        this.bgmVolume      = (localStorage.getItem('promoduck_bgm_volume') != null ? localStorage.getItem('promoduck_bgm_volume') / 100 : 1);
        this.movingBG       = (localStorage.getItem('promoduck_moving_bg') != null ? localStorage.getItem('promoduck_moving_bg') == 1 : true);
        this.screenShake    = (localStorage.getItem('promoduck_screen_shake') != null ? localStorage.getItem('promoduck_screen_shake') == 1 : true);

        document.querySelector('#sfx_volume').addEventListener('input', this.OnVolumeChange.bind(this));
        document.querySelector('#sfx_volume').addEventListener('change', (e) => this.OnVolumeChange(e, true));
        document.querySelector('#bgm_volume').addEventListener('input', this.OnVolumeChange.bind(this));
        document.querySelector('#bgm_volume').addEventListener('change', (e) => this.OnVolumeChange(e, true));
        document.querySelector('#moving_bg').addEventListener('input', this.OnMovingBGChange.bind(this));
        document.querySelector('#screen_shake').addEventListener('input', this.OnSSChange.bind(this));
        //document.querySelector('#language').addEventListener('input', this.OnLanguageChange.bind(this));

        document.querySelector('#settings_open').addEventListener('click', this.Open.bind(this));
        document.querySelector('#settings_background').addEventListener('click', this.Close.bind(this));
        document.querySelector('#fullscreen').addEventListener('click', this.Fullscreen.bind(this));
        
        document.querySelector('#sfx_volume').value  = ~~(this.sfxVolume * 100);
        document.querySelector('#bgm_volume').value  = ~~(this.bgmVolume * 100);
        document.querySelector('#moving_bg').checked = this.movingBG;
        document.querySelector('#screen_shake').checked = this.screenShake;
        
        this.UpdateRangeBackground(document.querySelector('#sfx_volume'), this.sfxVolume);
        this.UpdateRangeBackground(document.querySelector('#bgm_volume'), this.bgmVolume);
    }

    Start()
    {
        document.querySelector('label[for="sfx_volume"]').textContent = loc.Get('hud', 'sfx');
        document.querySelector('label[for="bgm_volume"]').textContent = loc.Get('hud', 'bgm');
        document.querySelector('label[for="moving_bg"]').textContent = loc.Get('hud', 'moving_bg');
        document.querySelector('label[for="screen_shake"]').textContent = loc.Get('hud', 'screen_shake');
        //document.querySelector('label[for="language"]').textContent = loc.Get('hud', 'language');
    }

    Open()
    {
        if(document.querySelector('#settings').classList.contains('visible'))
            this.Close();
        else
        {
            document.querySelector('#settings').classList.add('visible');
            this.opened = true;
        }
    }
    Close()
    {
        document.querySelector('#settings').classList.remove('visible');
        this.opened = false;
    }
    Fullscreen()
    {
        if(!document.fullscreenElement)
            document.querySelector('.game_wrapper').requestFullscreen();
        else if(document.exitFullscreen)
            document.exitFullscreen();
    }

    OnVolumeChange(e, _final)
    {
        let bgm = false;
        let value = e.target.value / 100;
        if(e.target.id == 'sfx_volume')
        {
            bgm = false;
            this.sfxVolume = value;
            
            if(_final)
                localStorage.setItem('promoduck_sfx_volume', e.target.value);
        }
        else if(e.target.id == 'bgm_volume')
        {
            bgm = true;
            this.bgmVolume = value;

            if(_final)
                localStorage.setItem('promoduck_bgm_volume', e.target.value);
        }

        this.UpdateRangeBackground(e.target, value);

        res.OnVolumeChange(bgm, value);
        if(_final && !bgm)
            Utils.RandomArray([res.sfx.click1, res.sfx.click2, res.sfx.click3]).play();
    }
    UpdateRangeBackground(_target, _value)
    {
        let background = _target.parentNode.querySelector('.progress_background');
        if(background != null)
            background.style.width = `${_value * 100}%`;
    }

    OnMovingBGChange(e)
    {
        this.movingBG = e.target.checked;
        localStorage.setItem('promoduck_moving_bg', this.movingBG ? 1 : 0);
    }
    OnSSChange(e)
    {
        this.screenShake = e.target.checked;
        localStorage.setItem('promoduck_screen_shake', this.screenShake ? 1 : 0);
    }

    OnLanguageChange(e)
    {
        this.language = e.target.value;
        loc.language = this.language;
    }
}

class Localization
{
    constructor()
    {
        this.language = localStorage.getItem('promoduck_language') != null ? localStorage.getItem('promoduck_language') : 'ru';
        if(['en', 'ru'].indexOf(this.language) == -1)
            this.language = 'ru';
    }

    Get(_group, _reference)
    {
        return res.loc[this.language].GetString(_group, _reference);
    }
    Dial(_character, _reference)
    {
        return [...res.loc[this.language].GetDialogue(_character, _reference)];
    }
}

let started = false;
window.addEventListener('click', (e) => {
    if(started)
        return;
    
    if(res.ready)
        Start();
});

window.addEventListener('load', () =>
{
    res = new GameResources();
    res.Load();

    loc = new Localization();
    settings = new Settings();

    res.onReady = Ready;
    res.onProgress = Progress;
});
function Ready()
{
    //Start();

    settings.Start();
    
    document.querySelector('#progress').textContent = loc.Get('hud', 'click_to_start');
}
function Start()
{
    started = true;
    document.querySelector('.preloader').style.display = 'none';
    
    battle = new Battle();
    battle.Start();
}
function Restart()
{
    for(let i in res.sfx)
    {
        let sfx = res.sfx[i];

        sfx.pause();
        sfx.ended = true;
    }

    if(battle != null)
    {
        battle.Destroy();
    }

    battle = new Battle();
    battle.Start(true);
}
function Progress(i)
{
    document.querySelector('#progress').textContent = `${~~(i * 100)}%`;
}