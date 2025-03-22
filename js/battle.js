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
        this.textBounds = {x1: battle.defaultBounds.x1 + 25, x2: battle.defaultBounds.x2 - 25, y1: battle.defaultBounds.y1 + 25, y2: battle.defaultBounds.y2 - 15};
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

            let regex = /#[\dA-Za-z]+/.exec(text);
            if(regex)
                this.expressions[i] = regex[0].split('#')[1];

            this.text[i] = text.replaceAll(/#[\dA-Za-z]+/g, '');
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
            _ctx.fillText(loc.Get('hud', 'click_to_continue'), this.textBounds.x2, this.textBounds.y2);
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
                case '$':
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
            case '$':

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
        let wawyText = false;

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
                // волна
                if(char == '$')
                {
                    wawyText = !wawyText;
                    continue;
                }

                let offset = {x: 0, y: 0};
                if(shakeText)
                {
                    offset.x = (Math.random() - .5) * this.textSize / 9;
                    offset.y = (Math.random() - .5) * this.textSize / 9;
                }
                if(wawyText)
                {
                    offset.x = Math.cos(_dt / 150 + (i + j) / 2) * this.textSize / 12;
                    offset.y = -Math.sin(_dt / 150 + (i + j) / 2) * this.textSize / 12;
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
        let y = this.textBounds.y1 - 14;
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
            _ctx.fillText(loc.Get('hud', 'click_to_continue'), x, y + h + 10);
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
                {name: loc.Get('hud', 'back'), modes: [IDLE], index: {x: 1, y: 2}, action: battle.Back.bind(battle), back: true},
                {name: loc.Get('hud', 'attack'), modes: [OWN_ATTACK], index: {x: 0, y: 0}, action: battle.OwnAttack.bind(battle)},
                {name: loc.Get('hud', 'act'), modes: [ACT, DRAW], index: {x: 1, y: 0}, action: battle.Act.bind(battle)},
                {name: loc.Get('hud', 'items'), modes: [ITEMS], index: {x: 0, y: 1}, action: battle.Items.bind(battle)},
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
        if(battle.mode.id != IDLE && (battle.mode.locked || battle.mode.drawingLocked))
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
            if(button.back && (battle.mode.locked || battle.mode.drawingLocked || battle.mode.id == IDLE))
                continue;

            if(target == button || button.modes.indexOf(battle.mode.id) != -1)
                _ctx.fillStyle = _ctx.strokeStyle = '#0d85f3';
            else if(battle.mode.id == IDLE || !battle.mode.locked && !battle.mode.drawingLocked)
                _ctx.fillStyle = _ctx.strokeStyle = '#000';
            else
                _ctx.fillStyle = _ctx.strokeStyle = '#aaa';

            _ctx.fillStyle = '#fff';
            _ctx.beginPath();
            Utils.RoundedRect(_ctx, button.x, battle.defaultBounds.y2 + 70, button.w, 70, 6);
            _ctx.fill();
            _ctx.stroke();
            _ctx.closePath();

            _ctx.fillStyle = _ctx.strokeStyle;
            Utils.MaskSprite(_ctx, battle.tempCtx, res.sprites.buttons, button.index.x * 50, button.index.y * 50, 50, 50, button.x + 10, battle.defaultBounds.y2 + 70 + 70 / 2 - 25, 50, 50, _ctx.fillStyle);

            if(!button.back)
                _ctx.fillText(button.name, button.x + 70, battle.defaultBounds.y2 + 70 + 70 / 2 + 4);
        }
    }
}

class BattleBackground
{
    constructor()
    {
        this.distance = 125;
        this.rowOffset = 50;

        this.speed = .5;
        this.scroll = {x: 0, y: 0};
        this.patterns = [];

        this.backgroundCanvas = document.createElement('canvas');
        this.backgroundCtx = this.backgroundCanvas.getContext('2d');
        this.backgroundCtx.imageSmoothingEnabled = false;
    }

    Start()
    {
        this.rows = 6;
        this.columns = 4;

        let len = res.sheets.patterns.parts['pattern'].length;

        let j = 0;
        for(let i = 0; i < this.rows * this.columns; i++)
        {
            let pattern = {};
            
            pattern.id = j % len;
            j++;

            pattern.x = i % this.rows * this.distance - ~~(i / this.rows) * this.rowOffset;
            pattern.y = ~~(i / this.rows) * this.distance;
            
            if(pattern.x == 0 && pattern.y > 0)
                j = Utils.RandomRound(j % len, len);
            
            pattern.rotation = Utils.Random(-Math.PI / 12, Math.PI / 12);

            this.patterns.push(pattern);
        }

        this.backgroundCanvas.width = this.rows * this.distance;
        this.backgroundCanvas.height = this.columns * this.distance;
        
        this.backgroundCtx.clearRect(0, 0, this.backgroundCanvas.width, this.backgroundCanvas.height);
        this.backgroundCtx.globalAlpha = .25;

        this.backgroundCtx.translate(this.distance / 4, this.distance / 4);
        for(let i in this.patterns)
        {
            let pattern = this.patterns[i];
            this.DrawPattern(this.backgroundCtx, pattern, pattern.x, pattern.y);
        }

        // зациклим первый ряд вертикально
        for(let i = 0; i < this.patterns.length; i += this.rows)
        {
            let pattern = this.patterns[i];
            this.DrawPattern(this.backgroundCtx, pattern, pattern.x + this.rows * this.distance, pattern.y);

            if(i + 1 < this.patterns.length)
            {
                pattern = this.patterns[i + 1];
                this.DrawPattern(this.backgroundCtx, pattern, pattern.x + this.rows * this.distance, pattern.y);
            }
        }

        // и горизонтально
        for(let i = 0; i < this.rows; i++)
        {
            let pattern = this.patterns[i];
            this.DrawPattern(this.backgroundCtx, pattern, pattern.x, pattern.y + this.columns * this.distance);
        }

        // и по диагонали
        let pattern = this.patterns[0];
        this.DrawPattern(this.backgroundCtx, pattern, pattern.x + this.rows * this.distance, pattern.y + this.columns * this.distance);

        // паттерн
        this.pattern = battle.ctx.createPattern(this.backgroundCanvas, 'repeat');

        let x = battle.canvas.width / 2;
        let y = battle.canvas.height / 2 - 300;
        this.gradient = battle.ctx.createRadialGradient(x, y, battle.canvas.width / 4, x, y, battle.canvas.width / 2);
        this.gradient.addColorStop(0, 'rgba(237, 238, 240, 0)');
        this.gradient.addColorStop(1, 'rgba(237, 238, 240, .8)');
    }
    Render(_ctx, delta)
    {
        _ctx.fillStyle = '#edeef0';
        _ctx.fillRect(0, 0, _ctx.canvas.width, _ctx.canvas.height);

        if(settings.movingBG)
        {
            this.scroll.x -= this.speed * delta;
            if(this.scroll.x <= -this.backgroundCanvas.width)
                this.scroll.x = 0;

            this.scroll.y += this.speed * delta;
            if(this.scroll.y >= this.backgroundCanvas.height)
                this.scroll.y = 0;
        }

        _ctx.save();
        _ctx.translate(this.scroll.x, this.scroll.y);

        _ctx.fillStyle = this.pattern;
        _ctx.fillRect(0, -_ctx.canvas.height, _ctx.canvas.width * 2, _ctx.canvas.height * 2);

        _ctx.restore();

        _ctx.fillStyle = this.gradient;
        _ctx.fillRect(0, 0, _ctx.canvas.width, _ctx.canvas.height);
    }

    DrawPattern(_ctx, _pattern, _x, _y)
    {
        _ctx.save();
        _ctx.translate(_x, _y);
        _ctx.rotate(_pattern.rotation);
        res.sheets.patterns.Draw(_ctx, 'pattern', _pattern.id, 0, 0, -1, -1, true, true);
        _ctx.restore();
    }
}

class EnemiesContainer
{
    constructor()
    {
        this.enemiesCanvas = document.createElement('canvas');
        this.enemiesCtx    = this.enemiesCanvas.getContext('2d');
        this.enemiesCtx.imageSmoothingEnabled = false;

        this.alphaTime = 10;
        this.alphaTimer = 0;
        this.alphaBack = true;

        this.state = STATE_NORMAL;
    }

    Start()
    {
        this.enemiesCanvas.width = battle.canvas.width;
        this.enemiesCanvas.height = battle.canvas.height;

        this.AlignEnemies();
    }

    AlignEnemies()
    {
        let w = 0;
        for(let i in battle.enemies)
        {
            let enemy = battle.enemies[i];
            w += enemy.sprite.w;
            if(i + 1 < battle.enemies.length)
                w += 50;
        }
        let curX = battle.defaultBounds.x1 + (battle.defaultBounds.x2 - battle.defaultBounds.x1 - w) / 2;
        for(let i in battle.enemies)
        {
            let enemy = battle.enemies[i];
            enemy.sprite.x = curX;
            
            curX += enemy.sprite.w + 50;
        }
    }

    GameLoop(_delta)
    {
        if(this.alphaTimer > 0)
        {
            this.alphaTimer -= 1 * _delta;
            if(this.alphaTimer < 0)
                this.alphaTimer = 0;
        }

        for(let i in battle.enemies)
        {
            battle.enemies[i].sprite.GameLoop(_delta);
        }
    }

    SetState(_state)
    {
        let oldState = this.state;

        this.state = _state;

        if(this.state == STATE_ATTACKING)
        {
            this.alphaBack = false;
            this.alphaTimer = this.alphaTime;
        }
        else if(oldState == STATE_ATTACKING)
        {
            this.alphaBack = true;
            this.alphaTimer = this.alphaTime;
        }

        if(this.state == STATE_BYE)
            this.alphaTimer = 0;
    }

    Render(_ctx, _dt)
    {
        this.enemiesCtx.clearRect(0, 0, this.enemiesCanvas.width, this.enemiesCanvas.height);

        // враги
        for(let i in battle.enemies)
        {
            let enemy = battle.enemies[i];
            enemy.sprite.Render(this.enemiesCtx, _dt);
        }

        if(this.alphaTimer >= 0)
        {
            if(this.alphaBack)
                this.enemiesCtx.globalAlpha = .5 - (this.alphaTime - this.alphaTimer) / this.alphaTime / 2;
            else
                this.enemiesCtx.globalAlpha = .5 * (this.alphaTime - this.alphaTimer) / this.alphaTime;
        }
        
        this.enemiesCtx.globalCompositeOperation = 'source-atop';
        this.enemiesCtx.fillStyle = '#fff';
        this.enemiesCtx.fillRect(0, 0, this.enemiesCanvas.width, this.enemiesCanvas.height);
        this.enemiesCtx.globalCompositeOperation = 'source-over';

        this.enemiesCtx.globalAlpha = 1;

        _ctx.drawImage(this.enemiesCanvas, 0, 0);
    }
}

class Battle
{
    constructor()
    {
        this.canvas = document.querySelector('#battle');
        this.ctx    = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.resetTransform();
        this.ctx.translate(.5, .5);

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
            new DealMode(),
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

        this.defaultBounds = {x1: 200, y1: 340, x2: 1080, y2: 550, a: 1};
        this.bounds = {...this.defaultBounds};
        this.targetBounds = {...this.bounds};
        this.fakeBounds = null;

        this.boundsReady = true;
        this.slowBounds = false;
        
        this.ui = new BattleUI();

        this.enemies = [
            new PromoDuck(),
        ];

        for(let i in this.enemies)
        {
            let enemy = this.enemies[i];
            enemy.CreateSprite(0, 0);
        }

        this.lastActionResult = null;

        this.mousePos = {x: this.defaultBounds.x1, y: this.defaultBounds.y1};
        this.soul = new Soul(this.mousePos.x, this.mousePos.y);
       
        this.maxHP = 20;
        this.hp = this.maxHP;
        this.tp = 0;
        this.effects = [];

        this.inventory = [
            new Sharpener(),
            new RubberBand(),
            new GhostCandy()
        ];

        this.ownAttacks = 
        {
            '':         {id: '', damage: 0, sheet: res.sheets.triangle},
            'circle':   {id: 'circle', damage: 25, sheet: res.sheets.circle, sfx: [res.sfx.circle1, res.sfx.circle2]},
            'triangle': {id: 'triangle', damage: 50, sheet: res.sheets.triangle, sfx: [res.sfx.triangle1, res.sfx.triangle2]},
            'star':     {id: 'star', damage: 75, sheet: res.sheets.star, sfx: [res.sfx.star1, res.sfx.star2]},
        };
        this.ownAttackIndex = 1;

        this.attack = null;
        this.attackCounter = 0; 

        this.projectiles = [];

        this.background = new BattleBackground();
        this.enemiesContainer = new EnemiesContainer();

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
        res.sfx.bgm.play();

        this.background.Start();
        this.enemiesContainer.Start();
        this.ui.Start();

        for(let i in this.enemies)
            this.enemies[i].Start();

        this.SetMode(IDLE);

        //this.SetMode(ATTACK);
        //this.Attack();
    }

    SetBounds(_bounds, _slow = false, _instant = false)
    {
        this.slowBounds = _slow;

        this.targetBounds = {..._bounds};
        this.boundsReady = false;

        if(Utils.BoundsEqual(this.bounds, this.targetBounds) || _instant)
        {
            this.slowBounds = false;
            this.bounds = {...this.targetBounds};
            this.boundsReady = true;
        }
    }
    ResetBounds(_slow = false, _instant = false)
    {
        this.SetBounds({...this.defaultBounds}, _slow, _instant);
        this.ResetFakeBounds();
    }

    SetFakeBounds(_bounds)
    {
        this.fakeBounds = {x1: this.targetBounds.x1 + _bounds.x1, x2: this.targetBounds.x2 + _bounds.x2, y1: this.targetBounds.y1 + _bounds.y1, y2: this.targetBounds.y2 + _bounds.y2};
    }
    ResetFakeBounds()
    {
        this.fakeBounds = null;
    }

    AddEffect(_id, _turns)
    {
        let existingEffect = this.GetEffect(_id);
        if(existingEffect != null)
            existingEffect.turns += _turns;
        else
        {
            this.effects.push({id: _id, turns: _turns});
        }
    }
    GetEffect(_id)
    {
        let existingEffect = this.effects.filter((_a) => _a.id == _id);
        return existingEffect.length > 0 ? existingEffect[0] : null;
    }
    HasEffect(_id)
    {
        return this.GetEffect(_id) != null;
    }
    OnTurnEnd()
    {
        for(let i = this.effects.length - 1; i >= 0; i--)
        {
            let effect = this.effects[i];

            if(effect.id == EFFECT_DRAWING_TIME)
                continue;
            
            this.DecreaseEffectTurns(effect.id);
        }
    }
    DecreaseEffectTurns(_id)
    {
        let effect = this.GetEffect(_id);
        if(effect == null)
            return;

        effect.turns--;
        if(effect.turns <= 0)
        {
            this.effects.splice(this.effects.indexOf(effect), 1);
            res.sfx.effectEnd.play();
        }
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
        
        this.background.Render(this.ctx, delta);
        this.enemiesContainer.Render(this.ctx, _dt);

        // спич баболы
        for(let i in this.enemies)
        {
            let enemy = this.enemies[i];

            if(enemy.sprite.speaking)
                enemy.sprite.speechBubble.Render(this.ctx, _dt);
        }
        
        // здоровье
        let x = this.defaultBounds.x1 + (this.defaultBounds.x2 - this.defaultBounds.x1) / 2 - 200 / 2;
        let y = this.defaultBounds.y2 + 10 + 9;

        this.ctx.save();
        this.ctx.beginPath();
        Utils.RoundedRect(this.ctx, x, y, 200, 32, 6);
        this.ctx.clip();
        
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(x, y, 200, 32);
        this.ctx.fillStyle = '#0d85f3';
        this.ctx.fillRect(x, y, 200 * this.hp / this.maxHP, 32);

        this.ctx.restore();

        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = '#000';
        this.ctx.stroke();

        this.ctx.closePath();

        this.ctx.font = '24px Pangolin';
        this.ctx.fillStyle = '#fff';
        this.ctx.textBaseline = 'middle';
        this.ctx.textAlign = 'center';
        
        //this.ctx.globalCompositeOperation = 'difference';
        this.ctx.fillText(`${this.hp} / ${this.maxHP}`, x + 200 / 2, y + 1 + 32 / 2);
        //this.ctx.globalCompositeOperation = 'source-over';

        this.ctx.drawImage(res.sprites.effects, 0, 0, 24, 24, x - 24 - 6, y + 4, 24, 24);
        
        // эффекты
        this.ctx.fillStyle = '#000';
        this.ctx.textAlign = 'left';
        for(let i in this.effects)
        {
            let effect = this.effects[i];
            this.ctx.drawImage(res.sprites.effects, effect.id * 24, 0, 24, 24, x + 200 + 12 + 55 * i, y + 4, 24, 24);
            this.ctx.fillText(`${effect.turns}`, x + 200 + 12 + 55 * i + 24 + 6, y + 1 + 32 / 2);
        }

        // кнопки
        this.ui.Render(this.ctx, _dt);

        // поле боя
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = '#000';
        this.ctx.fillStyle = '#fff';

        this.ctx.beginPath();
        Utils.RoundedRect(this.ctx, this.bounds.x1, this.bounds.y1, this.bounds.x2 - this.bounds.x1, this.bounds.y2 - this.bounds.y1, 6);
        
        this.ctx.globalAlpha = this.bounds.a;
        this.ctx.fill();
        this.ctx.globalAlpha = 1;

        this.ctx.stroke();
        this.ctx.closePath();

        // текущий режим
        this.mode.Render(this.ctx, _dt);

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
            let speed = (this.slowBounds ? 0.15 : 0.3) * _delta;
            this.bounds.x1 = Utils.Lerp(this.bounds.x1, this.targetBounds.x1, speed);
            this.bounds.y1 = Utils.Lerp(this.bounds.y1, this.targetBounds.y1, speed);
            this.bounds.x2 = Utils.Lerp(this.bounds.x2, this.targetBounds.x2, speed);
            this.bounds.y2 = Utils.Lerp(this.bounds.y2, this.targetBounds.y2, speed);
            this.bounds.a = Utils.Lerp(this.bounds.a, this.targetBounds.a, speed);

            if(Utils.BoundsEqual(this.bounds, this.targetBounds))
            {
                this.slowBounds = false;
                this.bounds = {...this.targetBounds};
                this.boundsReady = true;
            }
        }

        this.enemiesContainer.GameLoop(_delta);
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
        for(let i in battle.enemies)
            battle.enemies[i].sprite.ResetExpression();

        this.SetMode(ATTACK);
        this.ResetBounds();

        let attackData = this.enemies[0].GetAttack();
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
        this.OnTurnEnd();

        this.lastActionResult = this.enemies[0].AttackEnd();
        if(this.lastActionResult && this.lastActionResult.speech)
            this.SetMode(POST_ATTACK);
        else
            this.Idle();
    }

    OwnAttack()
    {
        if(battle.soul.eaten)
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
        if(this.mode.id == ACT)
            this.Idle();
        else
            this.SetMode(ACT);
    }
    Items()
    {
        if(this.mode.id == ITEMS)
            this.Idle();
        else
            this.SetMode(ITEMS);
    }
    Idle()
    {
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
        if(this.mode != null && this.mode.id == GAME_OVER)
            return;

        this.attack = null;
        this.projectiles = [];

        this.mode = this.modes[_id];
        this.mode.Start();
        
        for(let i in this.enemies)
        {
            let enemy = this.enemies[i];

            if(!enemy.alive)
                continue;

            enemy.sprite.SetAnimation(_id == ATTACK ? STATE_ATTACKING : STATE_NORMAL, 0);
        }

        this.enemiesContainer.SetState(_id == ATTACK ? STATE_ATTACKING : STATE_NORMAL);
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

        if(this.soul.eaten)
        {
            if(this.canvas.style.cursor != '')
                this.canvas.style.cursor = '';
        }
        else if(this.mode.id == PRE_ATTACK || this.mode.id == ATTACK || this.mode.drawingLocked)
        {
            if(
                pos.x >= this.bounds.x1 && pos.x <= this.bounds.x2 &&
                pos.y >= this.bounds.y1 && pos.y <= this.bounds.y2 &&
                !this.soul.locked && !this.soul.slowed
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

    IsCursorInsideBounds()
    {
        if(battle.mousePos.x < battle.targetBounds.x1 || battle.mousePos.x > battle.targetBounds.x2 ||
            battle.mousePos.y < battle.targetBounds.y1 || battle.mousePos.y > battle.targetBounds.y2)
            return false;

        return true;
    }
    SoulBounds()
    {
        return {
            x1: this.soul.x,
            y1: this.soul.y,
            x2: this.soul.x + this.soul.w + this.soul.pivot.x + this.soul.radius,
            y2: this.soul.y + this.soul.h + this.soul.pivot.y + this.soul.radius,
        }
    }

    MoveSoul()
    {
        let pos = {...this.mousePos};

        if(this.mode.id == PRE_ATTACK || this.mode.id == ATTACK || this.mode.drawingLocked)
        {
            pos = this.BoundSoulPos(pos);
        }

        this.soul.targetPos = pos;
    }
    BoundSoulPos(_pos)
    {
        let pos = {..._pos};
        
        let bounds = this.targetBounds;

        if(this.fakeBounds != null)
            bounds = this.fakeBounds;

        if(pos.x < bounds.x1)
            pos.x = bounds.x1;
        if(pos.x > bounds.x2 - this.soul.w - this.soul.pivot.x - this.soul.radius)
            pos.x = bounds.x2 - this.soul.w - this.soul.pivot.x - this.soul.radius;

        if(pos.y < bounds.y1)
            pos.y = bounds.y1;
        if(pos.y > bounds.y2 - this.soul.h - this.soul.pivot.y - this.soul.radius)
            pos.y = bounds.y2 - this.soul.h - this.soul.pivot.y - this.soul.radius;

        return pos;
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
        _target.hp -= _damage;
        if(_target.hp < 0)
            _target.hp = 0;
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

        this.locked = false;
        this.eaten = false;

        this.targetPos = {x: this.x, y: this.y};

        this.radius = 10;
        this.grazeRadius = 20;
        this.pivot = {x: this.radius, y: this.radius};

        this.invinsibleTime = 50;
        this.invinsibleTimer = 0;
        this.invinsible = false;
        
        this.slowed = false;
        this.maxSpeed = 15;
        this.damping = 0.5;
        this.mass = 7;
        this.velocity = {x: 0, y: 0};
    }

    Hurt()
    {
        if(battle.HasEffect(EFFECT_INVINSIBILITY))
            this.invinsibleTimer = this.invinsibleTime * 2;
        else
            this.invinsibleTimer = this.invinsibleTime;
        this.invinsible = true;

        Utils.RandomArray([res.sfx.hurt, res.sfx.hurt2]).play();
    }

    SetSlowed(_value)
    {
        this.slowed = _value;
        this.velocity.x = 0;
        this.velocity.y = 0;
    }

    GameLoop(_delta)
    {
        if(this.eaten)
            return;

        if(this.invinsibleTimer > 0)
        {
            this.invinsibleTimer -= 1 * _delta;

            if(this.invinsibleTimer <= 0)
                this.invinsible = false;
        }

        if(!this.locked)
        {
            if(this.slowed)
            {
                let acceleration = {x: (battle.mousePos.x - this.x) / this.mass, y: (battle.mousePos.y - this.y) / this.mass};

                this.velocity.x += acceleration.x;
                this.velocity.y += acceleration.y;

                this.velocity.x = Math.min(Math.max(this.velocity.x, -this.maxSpeed), this.maxSpeed);
                this.velocity.y = Math.min(Math.max(this.velocity.y, -this.maxSpeed), this.maxSpeed);

                let pos = {
                    x: this.x + this.velocity.x * _delta,
                    y: this.y + this.velocity.y * _delta,
                };
                pos = battle.BoundSoulPos(pos);
                this.x = pos.x;
                this.y = pos.y;

                this.velocity.x *= this.damping;
                this.velocity.y *= this.damping;
            }
            else
            {
                let speed = 0.5 * _delta;
                this.x = Utils.Lerp(this.x, this.targetPos.x, speed);
                this.y = Utils.Lerp(this.y, this.targetPos.y, speed);
            }
        }

        if(Utils.Distance({x: this.x, y: this.y}, this.targetPos) <= 1)
        {
            this.x = this.targetPos.x;
            this.y = this.targetPos.y;
        }
    }

    Render(_ctx, _dt)
    {
        if(this.eaten)
            return;

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

        let offset = 0;
        if(battle.HasEffect(EFFECT_DRAWING_TIME))
            offset = 33;
        _ctx.drawImage(res.sprites.soul, 0, offset, 32, 32, this.x, this.y, 32, 32);

        _ctx.globalAlpha = 1;
    }
}