var res,
    battle;

const   IDLE = 0,
        PRE_ATTACK = 1,
        ATTACK = 2,
        POST_ATTACK = 3,
        OWN_ATTACK = 4,
        ACT = 5,
        ITEMS = 6,
        DRAW = 7,
        GAME_OVER = 8,
        
        STATE_NORMAL = 0,
        STATE_HURT = 1,
        STATE_ATTACKING = 2,
        STATE_HANGING = 3,
        STATE_DEAD = 4,
        STATE_DRAW = 6,

        TEXT_COLORS = [
            '#000000',
            '#ff0000',
            '#ff6a00',
            '#ffffff'
        ];

class TypeWriter
{
    constructor(_parent = null, _showClickToContinueTip = true, _voice = res.sfx.check)
    {
        // todo: подчищать при уничтожении :)
        this.parent = _parent;
        this.voice = _voice;

        this.text = ['*Пора проснуться и почувствовать запах @1БОЛИ@.'];
        this.actions = [];

        this.textSize = 36;
        this.textBounds = {};
        
        this.textTriggers = [];
        this.currentAction = null;

        this.index = 0;
        this.value = 0;
        this.timer = 0;

        this.showClickToContinueTip = _showClickToContinueTip;
        this.clickedAtLeastOnce = false;

        this.stuckTime = 100;
        this.stuckTimer = this.stuckTime;
        
        this.autoSkipTime = 300;
        this.autoSkipTimer = this.autoSkipTime;
        
        this.lineFinished = true;
        this.finished = true;

        this.speed = 3;
        this.speedPunctuation = 10;
        this.speedNextLine = 50;
    }

    Start()
    {
        this.textSize = 36;
        this.textBounds = {x1: battle.defaultBounds.x1 + 25, x2: battle.defaultBounds.x2 - 25, y1: battle.defaultBounds.y1 + 25, y2: battle.defaultBounds.y2 - 25};
    }

    SetText(_text)
    {
        this.text = [..._text];
        this.actions = [];

        this.textTriggers = new Array(this.text.length);
        this.currentAction = null;
        for(let i in this.text)
        {
            let text = this.text[i];

            let regex = /&\d+/.exec(text);
            if(regex)
                this.textTriggers[i] = regex[0].split('&')[1] * 1;

            this.text[i] = text.replaceAll(/&\d+/g, '');
        }

        this.expressions = new Array(this.text.length);
        for(let i in this.text)
        {
            let text = this.text[i];

            let regex = /#\d+/.exec(text);
            if(regex)
                this.expressions[i] = regex[0].split('#')[1] * 1;

            this.text[i] = text.replaceAll(/#\d+/g, '');
        }

        battle.ctx.font = `${this.textSize}px Pangolin`;
        this.text = Utils.SliceText(battle.ctx, this.text, this.textBounds);

        this.SetIndex(0);
        this.value = 0;
        this.timer = 0;
        
        this.stuckTimer = this.stuckTime;
        
        this.lineFinished = false;
        this.finished = false;
    }
    GetText()
    {
        return this.text[this.index].slice(0, this.value);
    }
    SetActions(_actions)
    {
        this.actions = [..._actions];
    }

    PointerUp(e)
    {
        if(this.currentAction != null)
        {
            return;
        }

        if(!this.lineFinished)
        {
            this.value = this.text[this.index].length;
            this.FinishLine();
            return;
        }

        this.clickedAtLeastOnce = true;
        this.NextLine();
    }
    FinishLine()
    {
        this.lineFinished = true;

        let trigger = this.textTriggers[this.index];
        if(trigger != null && this.actions[trigger] != null)
        {
            this.currentAction = this.actions[trigger]();
            this.currentAction.Start();
        }
    }
    NextLine()
    {
        if(this.lineFinished && this.index + 1 < this.text.length)
        {
            this.SetIndex(this.index + 1);
        }
        else
        {
            this.finished = true;
        }
    }

    SetIndex(_index)
    {
        this.index = _index;

        this.lineFinished = false;
        this.stuckTimer = this.stuckTime;
        this.autoSkipTimer = this.autoSkipTime;
        
        this.value = 0;
        this.timer = 0;
    }

    Render(_ctx, _dt)
    {
        if(this.currentAction != null)
            this.currentAction.Render(_ctx, _dt);

        this.DrawText(_ctx, _dt);

        if(this.stuckTimer <= 0 && !this.clickedAtLeastOnce && this.showClickToContinueTip)
        {
            _ctx.font = '24px Pangolin';
            _ctx.fillStyle = '#666';
            _ctx.textBaseline = 'bottom';
            _ctx.textAlign = 'right';
            _ctx.fillText('Кликни, чтобы продолжить!', this.textBounds.x2, this.textBounds.y2);
        }
    }

    GameLoop(_delta)
    {
        if(this.currentAction != null)
        {
            this.currentAction.GameLoop(_delta);

            if(this.currentAction.finished)
            {
                this.NextLine();
                this.currentAction = null;
            }
            else
                return;
        }

        if(this.finished || this.lineFinished)
        {
            if(this.stuckTimer > 0)
                this.stuckTimer -= 1 * _delta;

            if(this.autoSkipTimer > 0)
            {
                this.autoSkipTimer -= 1 * _delta;

                if(this.autoSkipTimer <= 0)
                {
                    this.NextLine();
                }
            }
            
            return;
        }
        
        this.timer -= 1 * _delta;

        if(this.timer <= 0)
        {
            if(this.value >= this.text[this.index].length)
            {
                this.FinishLine();
                return;
            }

            let lastSymbol = this.text[this.index].charAt(this.value);
            let skipNextSymbol = false;
            
            switch(lastSymbol)
            {
                // служебные символы
                case '@':
                    skipNextSymbol = true;
                    this.timer = 0;
                    break;
                    
                case '^':
                    this.timer = 0;
                    break;

                case '.':
                    this.Speak(lastSymbol);
                case ',':
                case '?':
                case '!':
                case '—':
                case '*':
                case '(':
                case ')':
                    this.timer = this.speedPunctuation;
                    break;

                case '%':
                    this.timer = this.speedNextLine;
                    break;

                default:
                    this.timer = this.speed;
                    this.Speak(lastSymbol);
                    break;
            }

            this.value++;
            if(skipNextSymbol)
                this.value++;
        }
    }

    static IsPronounced(_symbol)
    {
        switch(_symbol)
        {
            case '@':
            case '^':

            case ',':
            case '?':
            case '!':
            case '—':
            case '*':
            case '(':
            case ')':
            case ' ':
            case '\n':
            case '~':
                return false;
        }

        return true;
    }
    CanPronounce()
    {
        if(this.value >= this.text[this.index].length)
            return false;

        return TypeWriter.IsPronounced(this.text[this.index].charAt(this.value));
    }

    Speak(_symbol)
    {
        if(!TypeWriter.IsPronounced(_symbol))
            return;

        this.voice.play();
    }
    
    DrawText(_ctx, _dt)
    {
        _ctx.font = `${this.textSize}px Pangolin`;
        _ctx.fillStyle = TEXT_COLORS[0];
        _ctx.textBaseline = 'top';
        _ctx.textAlign = 'left';

        let text = this.GetText();
        let lines = text.split(/\~|\n/).filter(a => a);

        let metrics = _ctx.measureText(text);
        let h = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;

        let customColor = false;
        let customColorSeeking = false;

        let shakeText = false;

        for(let i = 0; i < lines.length; i++)
        {
            let line = lines[i];
            
            let x = this.textBounds.x1;
            let y = this.textBounds.y1 + h * i;

            for(let j = 0; j < line.length; j++)
            {
                let char = line.charAt(j);

                // задержка текста
                if(char == '%')
                    continue;

                // окрашенный текст
                if(char == '@')
                {
                    // начали красить
                    if(!customColor)
                    {
                        customColor = true;
                        customColorSeeking = true;
                    }
                    // если мы уже начали, то это уже закрывающий "тег"
                    else
                    {
                        _ctx.fillStyle = TEXT_COLORS[0];
                        customColor = false;
                    }

                    continue;
                }
                // после @ должен идти индекс цвета, поэтому мы его отлавливаем!
                if(customColorSeeking)
                {
                    customColorSeeking = false;

                    // если кто-то накосячил с цветом, тупо игнорим
                    if(!isNaN(char * 1) && char * 1 >= 0 && char * 1 < TEXT_COLORS.length)
                    {
                        _ctx.fillStyle = TEXT_COLORS[char * 1];
                        continue;
                    }
                }

                // тряска
                if(char == '^')
                {
                    shakeText = !shakeText;
                    continue;
                }

                let offset = {x: 0, y: 0};
                if(shakeText)
                {
                    offset.x = (Math.random() - .5) * this.textSize / 9;
                    offset.y = (Math.random() - .5) * this.textSize / 9;
                }

                _ctx.fillText(char, x + offset.x, y + offset.y);
                x += _ctx.measureText(char).width;
            }
        }
    }
}

class SpeechBubble extends TypeWriter
{
    constructor(_parent = null, _voice = res.sfx.check)
    {
        super(_parent, true, _voice);
    }

    Start()
    {
        this.textSize = 24;
        this.textBounds = {x1: this.parent.x + this.parent.w + 15 + 10, x2: battle.defaultBounds.x2 - 15, y1: this.parent.y + 55 + 10, y2: 0};
    }

    NextLine()
    {
        this.parent.ResetExpression();
        super.NextLine();
    }

    SetIndex(_index)
    {
        super.SetIndex(_index);

        let expression = this.expressions[this.index];
        if(expression != null)
            this.parent.SetExpression(expression);
        else
            this.parent.ResetExpression();
    }

    Render(_ctx, _dt)
    {
        if(this.currentAction != null)
            this.currentAction.Render(_ctx, _dt);

        this.textBounds = {x1: this.parent.x + this.parent.w + 15 + 10, x2: battle.defaultBounds.x2 - 15, y1: this.parent.y + 55 + 10, y2: 0};
        
        let x = this.textBounds.x1 - 10;
        let y = this.textBounds.y1 - 10;
        let w = this.textBounds.x2 - x + 15;
        let h = Utils.TextHeight(_ctx, this.text[this.index], this.textSize, this.textBounds) + 20;
        let r = 6;

        _ctx.lineWidth = 3;
        _ctx.fillStyle = '#fff';
        _ctx.strokeStyle = '#000';
        _ctx.beginPath();
        _ctx.moveTo(x - 20, y + h / 2);
        _ctx.lineTo(x, y + h / 2 - 10);

        _ctx.arcTo(x, y, x + w, y, r);
        _ctx.arcTo(x + w, y,   x + w, y + h, r);
        _ctx.arcTo(x + w, y + h, x,   y + h, r);
        _ctx.arcTo(x, y + h, x, y, r);
        
        _ctx.lineTo(x, y + h / 2 + 10);
        _ctx.lineTo(x - 20, y + h / 2);
        _ctx.fill();
        _ctx.stroke();
        _ctx.closePath();

        this.DrawText(_ctx, _dt);

        if(this.stuckTimer <= 0 && !this.clickedAtLeastOnce && this.showClickToContinueTip)
        {
            _ctx.font = '16px Pangolin';
            _ctx.fillStyle = '#666';
            _ctx.fillText('Кликни, чтобы продолжить!', x, y + h + 10);
        }
    }
}

class BattleUI
{
    constructor()
    {
        this.clickTarget = null;
        this.buttonsPrepared = false;
    }

    Start()
    {
        if(!this.buttonsPrepared)
        {
            this.buttons = [
                {name: 'Назад', mode: IDLE, index: {x: 1, y: 2}, action: battle.Back.bind(battle), back: true},
                {name: 'Атака', mode: OWN_ATTACK, index: {x: 0, y: 0}, action: battle.OwnAttack.bind(battle)},
                {name: 'Действие', mode: ACT, index: {x: 1, y: 0}, action: battle.Act.bind(battle)},
                {name: 'Вещи', mode: ITEMS, index: {x: 0, y: 1}, action: battle.Items.bind(battle)},
            ];

            let w = (battle.defaultBounds.x2 - battle.defaultBounds.x1 - (this.buttons.length - 2) * 20) / (this.buttons.length - 1);
            for(let i in this.buttons)
            {
                let button = this.buttons[i];
                if(button.back)
                {
                    button.x = battle.defaultBounds.x1 - 70 - 20;
                    button.w = 70;
                    continue;
                }

                button.x = battle.defaultBounds.x1 + (i - 1) * (w + 20);
                button.w = w;
            }

            this.buttonsPrepared = true;
        }
    }

    TargetButton()
    {
        if(battle.mode.id != IDLE && battle.mode.locked)
            return null;

        if(battle.mousePos.y < battle.defaultBounds.y2 + 70 || battle.mousePos.y > battle.defaultBounds.y2 + 70 + 70)
            return null;

        for(let i in this.buttons)
        {
            if(battle.mousePos.x >= this.buttons[i].x && battle.mousePos.x <= this.buttons[i].x + this.buttons[i].w)
                return this.buttons[i];
        }

        return null;
    }

    PointerDown(e)
    {
        this.clickTarget = this.TargetButton();
    }
    PointerUp(e)
    {
        let target = this.TargetButton();

        if(target && target == this.clickTarget)
        {
            Utils.RandomArray([res.sfx.click1, res.sfx.click2, res.sfx.click3]).play();
            target.action();
        }

        this.clickTarget = null;
    }

    Render(_ctx, _dt)
    {
        _ctx.lineWidth = 3;

        let target = this.TargetButton();

        _ctx.font = '36px Pangolin';
        _ctx.textBaseline = 'middle';
        _ctx.textAlign = 'left';
        for(let i in this.buttons)
        {
            let button = this.buttons[i];
            if(button.back && (battle.mode.locked || battle.mode.id == IDLE))
                continue;

            if(target == button || battle.mode.id == button.mode)
                _ctx.fillStyle = _ctx.strokeStyle = '#0d85f3';
            else if(battle.mode.id == IDLE || !battle.mode.locked)
                _ctx.fillStyle = _ctx.strokeStyle = '#000';
            else
                _ctx.fillStyle = _ctx.strokeStyle = '#aaa';

            _ctx.beginPath();
            Utils.RoundedRect(_ctx, button.x, battle.defaultBounds.y2 + 70, button.w, 70, 6);
            _ctx.stroke();
            _ctx.closePath();

            Utils.MaskSprite(_ctx, battle.tempCtx, res.sprites.buttons, button.index.x * 50, button.index.y * 50, 50, 50, button.x + 10, battle.defaultBounds.y2 + 70 + 70 / 2 - 25, 50, 50, _ctx.fillStyle);

            if(!button.back)
                _ctx.fillText(button.name, button.x + 70, battle.defaultBounds.y2 + 70 + 70 / 2 + 4);
        }
    }
}

class Sheet
{
    constructor(_img, _json)
    {
        this.imgReady = false;
        this.imgUrl = _img;
        
        this.img = new Image();
        this.img.src = this.imgUrl;
        this.img.onload = this.OnImageLoad.bind(this);
        this.img.onerror = this.OnError.bind(this);


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
                    this.OnError();
            }
        }
        file.onerror = this.OnError;
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

    OnError(e)
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

    Draw(_ctx, _part, _frame, _x, _y, _w = -1, _h = -1, _center = false)
    {
        let part = this.parts[_part];

        if(part == null)
            return;

        let frame = part[_frame].frame;
        
        let w = _w > 0 ? _w : frame.w;
        let h = _h > 0 ? _h : frame.h;

        if(_center)
        {
            _x -= w / 2;
            _y -= h / 2;
        }
        else
        {
            _x += part[_frame].spriteSourceSize.x;
            _y += part[_frame].spriteSourceSize.y;
        }

        _ctx.drawImage(this.img, frame.x, frame.y, frame.w, frame.h, _x, _y, w, h);
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
            soul: 'soul.png',
            soulbreak: 'soulbreak.png',
            
            robot: 'robot.png',
            promote: 'promote.png',

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
            }
        };

        this.sfxPrefix = './sfx/';
        this.sfxData = {};
        this.sfx = {};
        this.sfxNames = 
        {
            bgm: {
                url: 'DUCK IDK.mp3',
                loop: true,
                volume: 0.5,
            },
            fail: {
                url: 'fail.mp3',
            },
            check: {
                url: 'check.ogg',
                volume: 0.8,
            },
            duck: {
                url: 'duck.ogg',
                volume: 1
            },
            jump: {
                url: 'jump.ogg'
            },
            hurt: {
                url: 'hurt.wav',
                volume: 0.6
            },
            hurt2: {
                url: 'hurt2.wav',
                volume: 0.6
            },
            death: {
                url: 'death.wav',
                volume: 0.6
            },
            circle1: {
                url: 'circle_1.ogg',
            },
            circle2: {
                url: 'circle_2.ogg',
            },
            triangle1: {
                url: 'triangle_1.ogg',
            },
            triangle2: {
                url: 'triangle_2.ogg',
            },
            star1: {
                url: 'star_1.ogg',
            },
            star2: {
                url: 'star_2.ogg',
            },
            click1:
            {
                url: 'jump.ogg',
            },
            click2:
            {
                url: 'jump2.ogg',
            },
            click3:
            {
                url: 'jump4.ogg',
            },
            scribble1:
            {
                url: 'scribble_1.wav',
            },
            scribble2:
            {
                url: 'scribble_2.wav',
            }
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

            if(typeof sfx == 'string')
                path = this.sfxPrefix + sfx;
            else
            {
                path = this.sfxPrefix + sfx.url;
                volume = sfx.volume != null ? sfx.volume : 1;
                loop = sfx.loop != null ? sfx.loop : false;
                speed = sfx.speed != null ? sfx.speed : 1;
            }

            let audio = new Audio(path);
            audio.volume = volume;
            audio.defaultPlaybackRate = speed;

            if(loop)
            {
                audio.onended = (e) => {
                    audio.currentTime = 0;
                    audio.play();
                }
            }

            this.sfxData[i] = 
            {
                url: path,
                src: audio,
                loaded: false,
                tries: 0
            };
            this.sfx[i] = audio;

            audio.load();
            audio.oncanplaythrough = () => this.OnLoad(i, 1);
            audio.onerror = () => this.OnError(i, 1);
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
        if(_type == 0 || _type == 1)
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

        let totalLen = Object.keys(this.spriteData).length + Object.keys(this.sfxData).length + Object.keys(this.sheetData).length;
        this.onProgress(readyCount / totalLen);
        if(readyCount == totalLen)
        {
            this.ready = true;

            if(this.onReady)
                this.onReady();
        }
    }
}

class Battle
{
    constructor()
    {
        this.canvas = document.querySelector('#battle');
        this.ctx    = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;

        this.tempCanvas = document.createElement('canvas');
        this.tempCtx    = this.tempCanvas.getContext('2d');
        this.tempCtx.imageSmoothingEnabled = false;

        this.modes =
        [
            new IdleMode(),
            new PreAttackMode(),
            new AttackMode(),
            new PostAttackMode(),
            new OwnAttackMode(),
            new ActMode(),
            new ItemsMode(),
            new DrawMode(),
            new GameOverMode()
        ];

        this.pointerDownBind = this.PointerDown.bind(this);
        this.contextMenuBind = (e) => e.preventDefault();
        this.pointerMoveBind = this.PointerMove.bind(this);
        this.pointerUpBind = this.PointerUp.bind(this);

        this.canvas.addEventListener('pointerdown', this.pointerDownBind);
        this.canvas.addEventListener('contextmenu', this.contextMenuBind);
        window.addEventListener('pointermove', this.pointerMoveBind);
        window.addEventListener('pointerup', this.pointerUpBind);

        this.defaultBounds = {x1: 200, y1: 350, x2: 1080, y2: 550};
        this.bounds = {...this.defaultBounds};
        this.targetBounds = {...this.bounds};
        this.boundsReady = true;
        
        this.ui = new BattleUI();

        this.enemies = [
            new PromoDuck(),
        ];

        for(let i in this.enemies)
        {
            let enemy = this.enemies[i];
            enemy.CreateSprite(0, 0);
        }
        this.AlignEnemies();

        this.lastActionResult = null;

        this.mousePos = {x: this.defaultBounds.x1, y: this.defaultBounds.y1};
        this.soul = new Soul(this.mousePos.x, this.mousePos.y);
       
        this.maxHP = 20;
        this.hp = this.maxHP;
        this.tp = 0;

        this.ownAttacks = 
        {
            '':         {id: '', damage: 0, sheet: res.sheets.triangle},
            'triangle': {id: 'triangle', damage: 30, sheet: res.sheets.triangle, sfx: [res.sfx.triangle1, res.sfx.triangle2]},
            'circle':   {id: 'circle', damage: 50, sheet: res.sheets.circle, sfx: [res.sfx.circle1, res.sfx.circle2]},
            'star':     {id: 'star', damage: 120, sheet: res.sheets.star, sfx: [res.sfx.star1, res.sfx.star2]},
        };
        this.ownAttackIndex = 1;

        this.attack = null;
        this.attackCounter = 0;

        this.projectiles = [];

        this.lastRender = 0;
        this.render = requestAnimationFrame(this.Render.bind(this));

        //this.gameLoop = setInterval(this.GameLoop.bind(this), 1000 / 60);
    }

    Destroy()
    {
        cancelAnimationFrame(this.render);

        this.canvas.removeEventListener('pointerdown', this.pointerDownBind);
        this.canvas.removeEventListener('contextmenu', this.contextMenuBind);
        window.removeEventListener('pointermove', this.pointerMoveBind);
        window.removeEventListener('pointerup', this.pointerUpBind);
    }

    Start()
    {
        //res.sfx.bgm.play();

        this.ui.Start();
        for(let i in this.enemies)
            this.enemies[i].Start();

        this.SetMode(IDLE);

        //this.SetMode(ATTACK);
        //this.Attack();
    }

    AlignEnemies()
    {
        let w = 0;
        for(let i in this.enemies)
        {
            let enemy = this.enemies[i];
            w += enemy.sprite.w;
            if(i + 1 < this.enemies.length)
                w += 50;
        }
        let curX = this.defaultBounds.x1 + (this.defaultBounds.x2 - this.defaultBounds.x1 - w) / 2;
        for(let i in this.enemies)
        {
            let enemy = this.enemies[i];
            enemy.sprite.x = curX;
            
            curX += enemy.sprite.w + 50;
        }
    }

    SetBounds(_bounds)
    {
        this.targetBounds = {..._bounds};
        this.boundsReady = false;

        if(Utils.BoundsEqual(this.bounds, this.targetBounds))
        {
            this.bounds = {...this.targetBounds};
            this.boundsReady = true;
        }
    }
    ResetBounds()
    {
        this.SetBounds({...this.defaultBounds});
    }

    Render(_dt)
    {
        let delta = (_dt - this.lastRender) / 16.67; // 1000 / 60
        if(delta > 1)
            delta = 1;
        
        this.lastRender = _dt;
        this.GameLoop(delta);
        
        this.render = requestAnimationFrame(this.Render.bind(this));

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if(this.mode.id == GAME_OVER)
        {
            this.mode.Render(this.ctx, _dt);
            return;
        }

        // утка
        for(let i in this.enemies)
        {
            let enemy = this.enemies[i];
            enemy.sprite.Render(this.ctx, _dt);
        }

        // спич баболы
        for(let i in this.enemies)
        {
            let enemy = this.enemies[i];

            if(enemy.sprite.speaking)
                enemy.sprite.speechBubble.Render(this.ctx, _dt);
        }

        // поле боя
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = '#000';

        this.ctx.beginPath();
        Utils.RoundedRect(this.ctx, this.bounds.x1, this.bounds.y1, this.bounds.x2 - this.bounds.x1, this.bounds.y2 - this.bounds.y1, 6);
        this.ctx.stroke();
        this.ctx.closePath();
        
        // здоровье
        let x = this.defaultBounds.x1 + (this.defaultBounds.x2 - this.defaultBounds.x1) / 2 - 200 / 2;
        let y = this.defaultBounds.y2 + 10 + 9;

        this.ctx.save();
        this.ctx.beginPath();
        Utils.RoundedRect(this.ctx, x, y, 200, 32, 6);
        this.ctx.clip();
        
        this.ctx.fillStyle = '#aaa';
        this.ctx.fillRect(x, y, 200, 32);
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(x, y, 200 * this.hp / this.maxHP, 32);

        this.ctx.restore();
        this.ctx.stroke();
        this.ctx.closePath();

        this.ctx.font = '24px Pangolin';
        this.ctx.fillStyle = '#fff';
        this.ctx.textBaseline = 'middle';
        this.ctx.textAlign = 'center';
        
        this.ctx.globalCompositeOperation = 'difference';
        this.ctx.fillText(`${this.hp} / ${this.maxHP}`, x + 200 / 2, this.defaultBounds.y2 + 10 + 10 + 32 / 2);
        this.ctx.globalCompositeOperation = 'source-over';

        // текущий режим
        this.mode.Render(this.ctx, _dt);

        // кнопки
        this.ui.Render(this.ctx, _dt);

        // душа, проджектайлы и атака
        this.soul.Render(this.ctx, _dt);

        this.projectiles.sort((a, b) =>
        {
            if(a.onTop != b.onTop)
                return a.onTop - b.onTop;

            return a.y - b.y;
        });

        for(let i in this.projectiles)
        {
            this.projectiles[i].Render(this.ctx, _dt);
        }

        if(this.attack != null)
            this.attack.Render(this.ctx, _dt);
    }
    GameLoop(_delta)
    {
        if(this.mode.id == GAME_OVER)
        {
            this.mode.GameLoop(_delta);
            return;
        }

        this.MoveSoul();

        if(!this.boundsReady)
        {
            this.bounds.x1 = Utils.Lerp(this.bounds.x1, this.targetBounds.x1, 0.3);
            this.bounds.y1 = Utils.Lerp(this.bounds.y1, this.targetBounds.y1, 0.3);
            this.bounds.x2 = Utils.Lerp(this.bounds.x2, this.targetBounds.x2, 0.3);
            this.bounds.y2 = Utils.Lerp(this.bounds.y2, this.targetBounds.y2, 0.3);

            if(Utils.BoundsEqual(this.bounds, this.targetBounds))
            {
                this.bounds = {...this.targetBounds};
                this.boundsReady = true;
            }
        }

        for(let i in this.enemies)
        {
            this.enemies[i].sprite.GameLoop(_delta);
        }
        this.mode.GameLoop(_delta);

        if(this.attack != null)
        {
            this.attack.GameLoop(_delta);

            for(let i in this.projectiles)
            {
                this.projectiles[i].GameLoop(_delta);
            }

            for(let i = this.projectiles.length - 1; i >= 0; i--)
            {
                let projectile = this.projectiles[i];
                
                if(!projectile)
                    continue;

                if(projectile.toDestroy)
                {
                    this.DestroyProjectileById(i);
                    continue;
                }

                if(projectile.Collision(false))
                {
                    this.Hurt(projectile.damage);

                    if(projectile.destructible)
                        projectile.toDestroy = true;
                }
                else if(projectile.Collision(true))
                {
                    this.Graze(projectile);
                }
                else if(
                    projectile.x + projectile.w < 0 ||
                    projectile.y + projectile.h < 0 ||
                    projectile.x - projectile.w > this.canvas.width ||
                    projectile.y - projectile.h > this.canvas.height
                )
                    projectile.toDestroy = true;
            }
        }

        this.soul.GameLoop(_delta);
    }

    Back()
    {
        if(this.mode.id == GAME_OVER)
            return;

        if(!this.mode.Back)
            return;

        this.mode.Back();
    }
    PreAttack()
    {
        if(this.mode.id == GAME_OVER)
            return;

        if(this.lastActionResult != null && (this.lastActionResult.text != null || this.lastActionResult.speech || this.lastActionResult.mode != null))
        { 
            if(this.lastActionResult.text != null || this.lastActionResult.speech != null)
                this.SetMode(PRE_ATTACK);
            else if(this.lastActionResult.mode != null)
                this.SetMode(this.lastActionResult.mode);
        }
        else
            this.Attack();
    }
    Attack()
    {
        if(this.mode.id == GAME_OVER)
            return;

        for(let i in battle.enemies)
            battle.enemies[i].sprite.ResetExpression();

        this.SetMode(ATTACK);
        this.ResetBounds();

        let attackData = this.enemies[0].GetAttack(this.attackCounter);
        if(attackData == null)
        {
            console.error('АТАКУ ДАЙ МНЕ ДУБИНА!!!');
            return;
        }
        let attack = new attackData.attackClass(this.enemies[0].sprite, attackData.difficulty);

        this.attack = attack;
        this.attack.Start();

        this.lastActionResult = null;
    }
    OnAttackEnd()
    {
        this.attackCounter++;

        this.lastActionResult = this.enemies[0].AttackEnd();
        if(this.lastActionResult && this.lastActionResult.speech)
            this.SetMode(POST_ATTACK);
        else
            this.Idle();
    }

    OwnAttack()
    {
        if(this.mode.id == GAME_OVER)
            return;

        if(this.mode.id == OWN_ATTACK)
            this.Idle();
        else
            this.SetMode(OWN_ATTACK);
    }
    OnOwnAttackEnd()
    {
        this.ownAttackIndex++;
        if(this.ownAttackIndex >= Object.keys(this.ownAttacks).length)
            this.ownAttackIndex = 1;

        let battleFinished = true;

        for(let i in this.enemies)
        {
            let enemy = this.enemies[i];

            if(enemy.hp <= 0 && enemy.alive)
                enemy.Die();

            // если хотя бы один соперник жив, бой продолжается!
            if(enemy.alive)
                battleFinished = false;
        }

        if(!battleFinished)
            this.PreAttack();
        else
        {
            alert('ТЫ ВЫИГРАЛ!');
            this.GameOver();
        }
    }

    Act()
    {
        if(this.mode.id == GAME_OVER)
            return;

        if(this.mode.id == ACT)
            this.Idle();
        else
            this.SetMode(ACT);
    }
    Items()
    {
        if(this.mode.id == GAME_OVER)
            return;

        if(this.mode.id == ITEMS)
            this.Idle();
        else
            this.SetMode(ITEMS);
    }
    Idle()
    {
        if(this.mode.id == GAME_OVER)
            return;
        
        this.SetMode(IDLE);
        this.ResetBounds();
        
        this.lastActionResult = null;
    }
    GameOver()
    {
        this.SetMode(GAME_OVER);
    }

    SetMode(_id)
    {
        this.attack = null;
        this.projectiles = [];

        this.mode = this.modes[_id];
        this.mode.Start();
        
        for(let i in this.enemies)
        {
            let enemy = this.enemies[i];

            if(!enemy.alive)
                continue;

            if(_id == ATTACK)
                enemy.sprite.SetAnimation(STATE_ATTACKING, 0);
            else
                enemy.sprite.SetAnimation(STATE_NORMAL, 0);
        }
    }

    AddProjectile(_attack, _projectile)
    {
        _projectile.Start();
        this.projectiles.push(_projectile);
        _attack.spawnedProjectiles.push(_projectile);
    }
    DestroyProjectileById(i)
    {
        let projectile = this.projectiles.splice(i, 1)[0];
        
        let parent = projectile.parent;
        let j = parent.spawnedProjectiles.indexOf(projectile);
        if(j != -1)
            parent.spawnedProjectiles.splice(j, 1);

        parent = null;
        projectile = null;
    }
    DestroyProjectile(_projectile)
    {
        let index = this.projectiles.indexOf(_projectile);

        if(index != -1)
            this.DestroyProjectileById(index);
    }

    PointerDown(e)
    {
        this.UpdateMousePos(e);
        this.mode.PointerDown(e);
    }
    PointerUp(e)
    {
        this.UpdateMousePos(e);
        this.mode.PointerUp(e);
    }
    PointerMove(e)
    {
        this.UpdateMousePos(e);
        this.mode.PointerMove(e);
    }

    UpdateMousePos(e)
    {
        let pos = Utils.MousePos(e, this.canvas);
        this.mousePos = pos;

        if(this.mode.id == PRE_ATTACK || this.mode.id == ATTACK || (this.mode.id == OWN_ATTACK && this.mode.locked) || this.mode.id == DRAW)
        {
            if(
                pos.x >= this.bounds.x1 && pos.x <= this.bounds.x2 &&
                pos.y >= this.bounds.y1 && pos.y <= this.bounds.y2
            )
                this.canvas.style.cursor = 'none';
            else if(this.canvas.style.cursor != '')
                this.canvas.style.cursor = '';
        }
        else if(this.mode.id == GAME_OVER)
        {
            this.mode.UpdateCursor();
        }
        else if(this.canvas.style.cursor != 'none')
            this.canvas.style.cursor = 'none';
    }

    TeleportSoulToCursor(e)
    {
        this.UpdateMousePos(e);
        this.MoveSoul();

        this.soul.x = this.soul.targetPos.x;
        this.soul.y = this.soul.targetPos.y;
    }

    MoveSoul()
    {
        let pos = {...this.mousePos};

        if(this.mode.id == PRE_ATTACK || this.mode.id == ATTACK || (this.mode.id == OWN_ATTACK && this.mode.locked) || this.mode.id == DRAW)
        {
            if(pos.x < this.targetBounds.x1)
                pos.x = this.targetBounds.x1;
            if(pos.x > this.targetBounds.x2 - this.soul.w - this.soul.pivot.x - this.soul.radius)
                pos.x = this.targetBounds.x2 - this.soul.w - this.soul.pivot.x - this.soul.radius;

            if(pos.y < this.targetBounds.y1)
                pos.y = this.targetBounds.y1;
            if(pos.y > this.targetBounds.y2 - this.soul.h - this.soul.pivot.y - this.soul.radius)
                pos.y = this.targetBounds.y2 - this.soul.h - this.soul.pivot.y - this.soul.radius;
        }

        this.soul.targetPos = pos;
    }

    Graze(_projectile)
    {
        if(this.soul.invinsible)
            return;

        //this.tp++;
    }
    Hurt(_damage)
    {
        if(this.soul.invinsible)
            return;
        
        this.soul.Hurt();
        this.hp -= _damage;
        
        if(this.hp <= 0)
        {
            this.hp = 0;
            this.GameOver();
        }
    }

    DealDamage(_target, _damage)
    {
        _target.data.hp -= _damage;
        if(_target.data.hp < 0)
            _target.data.hp = 0;
    }
}

class Entity
{
    constructor(_x, _y, _w, _h)
    {
        this.x = _x;
        this.y = _y;
        this.w = _w;
        this.h = _h;

        this.pivot = {x: this.w / 2, y: this.h / 2};
        this.rotation = 0;
    }

    Render(_ctx, _dt)
    {
        _ctx.save();
        _ctx.translate(this.x + this.pivot.x, this.y + this.pivot.y);
        _ctx.rotate(this.rotation);

        this.Draw(_ctx, _dt);

        _ctx.restore();
    }

    Draw(_ctx, _dt)
    {
        _ctx.fillStyle = 'green';
        _ctx.fillRect(-this.pivot.x, -this.pivot.y, this.w, this.h);

        /*_ctx.fillStyle = 'blue';
        _ctx.fillRect(-5, -5, 10, 10);*/
    }
}

class Soul extends Entity
{
    constructor(_x, _y)
    {
        super(_x, _y, 0, 0);

        this.targetPos = {x: this.x, y: this.y};

        this.radius = 10;
        this.grazeRadius = 20;
        this.pivot = {x: this.radius, y: this.radius};

        this.invinsibleTime = 50;
        this.invinsibleTimer = 0;
        this.invinsible = false;
    }

    Hurt()
    {
        this.invinsibleTimer = this.invinsibleTime;
        this.invinsible = true;

        Utils.RandomArray([res.sfx.hurt, res.sfx.hurt2]).play();
    }

    GameLoop(_delta)
    {
        if(this.invinsibleTimer > 0)
        {
            this.invinsibleTimer -= 1 * _delta;

            if(this.invinsibleTimer <= 0)
                this.invinsible = false;
        }

        this.x = Utils.Lerp(this.x, this.targetPos.x, 0.5 * _delta);
        this.y = Utils.Lerp(this.y, this.targetPos.y, 0.5 * _delta);

        if(Utils.Distance({x: this.x, y: this.y}, this.targetPos) <= 1)
        {
            this.x = this.targetPos.x;
            this.y = this.targetPos.y;
        }
    }

    Render(_ctx, _dt)
    {
        /*
        _ctx.beginPath();
        _ctx.fillStyle = 'orange';
        _ctx.arc(this.x + this.pivot.x, this.y + this.pivot.y, this.grazeRadius, 0, Math.PI * 2, true);
        _ctx.fill();
        _ctx.closePath();

        _ctx.beginPath();
        _ctx.fillStyle = 'green';
        _ctx.arc(this.x + this.pivot.x, this.y + this.pivot.y, this.radius, 0, Math.PI * 2, true);
        _ctx.fill();
        _ctx.closePath();*/

        if(this.invinsible && this.invinsibleTimer % 10 < 4)
            _ctx.globalAlpha = 0.5;

        _ctx.drawImage(res.sprites.soul, this.x, this.y);

        _ctx.globalAlpha = 1;
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

    static TextHeight(_ctx, _text, _textSize, _bounds)
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

    res.onReady = Ready;
    res.onProgress = Progress;
});
function Ready()
{
    Start();
    
    document.querySelector('#progress').textContent = 'Кликни, чтобы начать!';
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
        sfx.currentTime = 0;
        sfx.playbackRate = 1;
    }

    if(battle != null)
    {
        battle.Destroy();
    }

    battle = new Battle();
    battle.Start();
}
function Progress(i)
{
    document.querySelector('#progress').textContent = `${~~(i * 100)}%`;
}