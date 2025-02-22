var battle;

const   IDLE = 0,
        PRE_ATTACK = 1,
        ATTACK = 2,
        POST_ATTACK = 3,
        OWN_ATTACK = 4,
        ACT = 5,
        GAME_OVER = 6,
        
        STATE_NORMAL = 0,
        STATE_HURT = 1,
        STATE_ATTACKING = 2,
        STATE_HANGING = 3,
        STATE_DEAD = 4,
        STATE_HELP = 5,

        TEXT_COLORS = [
            '#000000',
            '#ff0000',
        ];

class TypeWriter
{
    constructor(_parent = null, _showClickToContinueTip = true)
    {
        // todo: подчищать при уничтожении :)
        this.parent = _parent;

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
        
        this.lineFinished = false;
        this.finished = false;

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

        battle.ctx.font = `${this.textSize}px Arial`;
        this.text = Utils.SliceText(battle.ctx, this.text, this.textBounds);

        this.index = 0;
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
            this.currentAction.Finish();
            this.currentAction = null;
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
            this.index++;

            this.lineFinished = false;
            this.stuckTimer = this.stuckTime;
            
            this.value = 0;
            this.timer = 0;
        }
        else
        {
            this.finished = true;
        }
    }

    Render(_ctx, _dt)
    {
        if(this.currentAction != null)
            this.currentAction.Render(_ctx, _dt);

        this.DrawText(_ctx, _dt);

        if(this.stuckTimer <= 0 && !this.clickedAtLeastOnce && this.showClickToContinueTip)
        {
            _ctx.font = '24px Arial';
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
                this.currentAction = null;
            else
                return;
        }

        if(this.finished || this.lineFinished)
        {
            if(this.stuckTimer > 0)
                this.stuckTimer -= 1 * _delta;
            
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
            switch(lastSymbol)
            {
                // служебные символы
                case '@':
                case '^':
                    this.timer = 0;
                    break;

                case ',':
                case '.':
                case '!':
                case '—':
                    this.timer = this.speedPunctuation;
                    break;

                case '%':
                    this.timer = this.speedNextLine;
                    break;

                default:
                    this.timer = this.speed;
                    break;
            }

            this.value++;
        }
    }
    
    DrawText(_ctx, _dt)
    {
        _ctx.font = `${this.textSize}px Arial`;
        _ctx.fillStyle = TEXT_COLORS[0];
        _ctx.textBaseline = 'top';
        _ctx.textAlign = 'left';

        let text = this.GetText();
        let lines = text.split(/\*|\n/).filter(a => a);

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
    constructor(_parent = null)
    {
        super(_parent, true);
    }

    Start()
    {
        this.textSize = 24;
        this.textBounds = {x1: this.parent.x + this.parent.w + 15 + 10, x2: battle.defaultBounds.x2 - 15, y1: this.parent.y + 55 + 10, y2: 0};
    }

    Render(_ctx, _dt)
    {
        if(this.currentAction != null)
            this.currentAction.Render(_ctx, _dt);

        let x = this.textBounds.x1 - 10;
        let y = this.textBounds.y1 - 10;
        let w = this.textBounds.x2 - x;
        
        let h = Utils.TextHeight(_ctx, this.text[this.index], this.textSize, this.textBounds) + 20;

        _ctx.fillStyle = '#fff';
        _ctx.strokeStyle = '#000';
        _ctx.beginPath();
        _ctx.moveTo(x - 20, y + h / 2);
        _ctx.lineTo(x, y + h / 2 - 10);
        _ctx.lineTo(x, y);
        _ctx.lineTo(x + w, y);
        _ctx.lineTo(x + w, y + h);
        _ctx.lineTo(x, y + h);
        _ctx.lineTo(x, y + h / 2 + 10);
        _ctx.lineTo(x - 20, y + h / 2);
        _ctx.fill();
        _ctx.stroke();

        this.DrawText(_ctx, _dt);

        if(this.stuckTimer <= 0 && !this.clickedAtLeastOnce && this.showClickToContinueTip)
        {
            _ctx.font = '16px Arial';
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
                {name: '<', mode: IDLE, action: battle.Back.bind(battle), back: true},
                {name: 'АТАКА', mode: OWN_ATTACK, action: battle.OwnAttack.bind(battle)},
                {name: 'ДЕЙСТВИЕ', mode: ACT, action: battle.Act.bind(battle)},
            ];

            let w = (battle.defaultBounds.x2 - battle.defaultBounds.x1 - (this.buttons.length - 2) * 20) / (this.buttons.length - 1);
            for(let i in this.buttons)
            {
                let button = this.buttons[i];
                if(button.back)
                {
                    button.x = battle.defaultBounds.x1 - 50 - 20;
                    button.w = 50;
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

        if(battle.mousePos.y < battle.defaultBounds.y2 + 70 || battle.mousePos.y > battle.defaultBounds.y2 + 70 + 50)
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
            target.action();
        }

        this.clickTarget = null;
    }

    Render(_ctx, _dt)
    {
        _ctx.lineWidth = 5;

        let target = this.TargetButton();

        _ctx.font = '36px Arial';
        _ctx.textBaseline = 'middle';
        _ctx.textAlign = 'center';
        for(let i in this.buttons)
        {
            let button = this.buttons[i];
            if(button.back && (battle.mode.locked || battle.mode.id == IDLE))
                continue;

            if(target == button || battle.mode.id == button.mode)
                _ctx.fillStyle = _ctx.strokeStyle = '#000';
            else if(battle.mode.id == IDLE || !battle.mode.locked)
                _ctx.fillStyle = _ctx.strokeStyle = '#666';
            else
                _ctx.fillStyle = _ctx.strokeStyle = '#aaa';

            _ctx.strokeRect(button.x, battle.defaultBounds.y2 + 70, button.w, 50);
            _ctx.fillText(button.name, button.x + button.w / 2, battle.defaultBounds.y2 + 70 + 25);
        }
    }
}

class BattleAudio
{
    constructor()
    {
        return;

        this.audioPending = false;
        this.audio = new Audio('./sfx/idk.mp3');
        this.audio.onended = () => this.audio.play();

        this.audio.play().catch((_error) =>
        {
            this.audioPending = true
        });
    }

    PointerUp(e)
    {
        if(this.audioPending)
        {
            this.audio.play();
            this.audioPending = false;
        }
    }
}

class Battle
{
    constructor()
    {
        this.canvas = document.querySelector('#battle');
        this.ctx    = this.canvas.getContext('2d');

        this.modes =
        [
            new IdleMode(),
            new PreAttackMode(),
            new AttackMode(),
            new PostAttackMode(),
            new OwnAttackMode(),
            new ActMode(),
            new GameOverMode()
        ];

        this.canvas.addEventListener('click', this.Click.bind(this));
        this.canvas.addEventListener('pointerdown', this.PointerDown.bind(this));
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        window.addEventListener('pointermove', this.PointerMove.bind(this));
        window.addEventListener('pointerup', this.PointerUp.bind(this));

        this.defaultBounds = {x1: 200, y1: 300, x2: 1080, y2: 550};
        this.bounds = {...this.defaultBounds};
        this.targetBounds = {...this.bounds};
        this.boundsReady = true;
        
        this.ui = new BattleUI();
        this.audio = new BattleAudio();

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
        this.hp = 20;
        this.tp = 0;

        this.attack = null;
        this.attackCounter = 0;

        this.projectiles = [];

        this.lastRender = 0;
        this.render = requestAnimationFrame(this.Render.bind(this));
        //this.gameLoop = setInterval(this.GameLoop.bind(this), 1000 / 60);
    }

    Start()
    {
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
        this.lastRender = _dt;
        this.GameLoop(delta);
        
        this.render = requestAnimationFrame(this.Render.bind(this));

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if(this.mode.id == GAME_OVER)
        {
            this.ctx.font = '36px Arial';
            this.ctx.fillStyle = '#000';
    
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(`Всё!`, this.canvas.width / 2, this.canvas.height / 2);

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
        
        this.ctx.lineWidth = 5;
        this.ctx.strokeStyle = '#000';
        this.ctx.fillStyle = '#fff';

        this.ctx.beginPath();
        this.ctx.rect(this.bounds.x1, this.bounds.y1, this.bounds.x2 - this.bounds.x1, this.bounds.y2 - this.bounds.y1);
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.closePath();
        
        // здоровье
        this.ctx.font = '36px Arial';
        this.ctx.fillStyle = '#000';

        this.ctx.textBaseline = 'top';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`${this.hp}/20`, this.defaultBounds.x1, this.defaultBounds.y2 + 10);

        this.ctx.textBaseline = 'bottom';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`${this.enemies[0].hp}/${this.enemies[0].maxHP}`, this.defaultBounds.x2, this.defaultBounds.y1 - 10);
        
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

            return ~~(a.y - b.y);
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
            return;

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

        if(this.lastActionResult && this.lastActionResult.speech)
            this.SetMode(PRE_ATTACK);
        else
            this.Attack();
    }
    Attack()
    {
        if(this.mode.id == GAME_OVER)
            return;

        this.SetMode(ATTACK);
        this.ResetBounds();

        let attack = this.enemies[0].GetAttack(this.attackCounter);
        if(attack == null)
        {
            console.error('АТАКУ ДАЙ МНЕ ДУБИНА!!!');
            return;
        }

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

    AddProjectile(_projectile)
    {
        _projectile.Start();
        this.projectiles.push(_projectile);
    }
    DestroyProjectileById(i)
    {
        this.projectiles.splice(i, 1);
    }
    DestroyProjectile(_projectile)
    {
        let index = this.projectiles.indexOf(_projectile);

        if(index != -1)
            this.DestroyProjectileById(index);
    }

    Click(e)
    {
        this.UpdateMousePos(e);
        this.mode.Click(e);
    }

    PointerDown(e)
    {
        this.UpdateMousePos(e);
        this.mode.PointerDown(e);
    }
    PointerUp(e)
    {
        this.audio.PointerUp(e);

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

        if(this.mode.id == PRE_ATTACK || this.mode.id == ATTACK || (this.mode.id == OWN_ATTACK && this.mode.locked))
        {
            if(
                pos.x >= this.bounds.x1 && pos.x <= this.bounds.x2 &&
                pos.y >= this.bounds.y1 && pos.y <= this.bounds.y2
            )
                this.canvas.style.cursor = 'none';
            else if(this.canvas.style.cursor != '')
                this.canvas.style.cursor = '';
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

        if(this.mode.id == PRE_ATTACK || this.mode.id == ATTACK || (this.mode.id == OWN_ATTACK && this.mode.locked))
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
            alert('ТЫ ПРОСРАЛ!');
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

        this.sprite = new Image();
        this.sprite.src = './img/soul.png';

        this.invinsibleTime = 50;
        this.invinsibleTimer = 0;
        this.invinsible = false;
    }

    Hurt()
    {
        this.invinsibleTimer = this.invinsibleTime;
        this.invinsible = true;
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

        _ctx.drawImage(this.sprite, this.x, this.y);

        if(this.invinsible)
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

    static SliceText(_ctx, _text, _bounds)
    {
        let newLines = [];

        for(let k in _text)
        {
            let ll = _text[k].split('*');
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

            newLines.push(ll.join('*'));
        }

        return newLines;
    }

    static TextHeight(_ctx, _text, _textSize, _bounds)
    {
        _ctx.font = `${_textSize}px Arial`;
        _ctx.textBaseline = 'top';

        let lines = _text.split(/\*|\n/).filter(a => a);

        let metrics = _ctx.measureText(_text);
        let h = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;

        return h * lines.length;
    }
}

window.addEventListener('load', () =>
{
    battle = new Battle();
    battle.Start();
});