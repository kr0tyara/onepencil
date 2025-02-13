var battle;

const   IDLE = 0,
        ATTACK = 1,
        OWN_ATTACK = 2,
        ACT = 3,
        GAME_OVER = 4,
        
        ATTACK_NONE = 0,
        ATTACK_CIRCLE = 1,
        ATTACK_TRIANGLE = 2,
        ATTACK_STAR = 3,
        
        STATE_NORMAL = 0,
        STATE_HURT = 1,
        STATE_ATTACKING = 2;

class EnemySprite
{
    constructor()
    {
        let spr = [
            './img/duck.png',
            './img/duck2.png',
        ];

        this.sprites = [];
        for(let i in spr)
        {
            let img = new Image();
            img.src = spr[i];
            this.sprites.push(img);
        }

        this.state = STATE_NORMAL;
        this.animationTime = 0;
    }

    SetAnimation(_state, _time)
    {
        this.state = _state;
        this.animationTime = _time;
    }

    Render(_ctx, _dt)
    {
        let shake = Math.sin(_dt / 20) * (20 * this.animationTime);

        if(this.state == STATE_ATTACKING)
            _ctx.globalAlpha = .5;

        // утка
        _ctx.drawImage(this.sprites[this.state == STATE_HURT ? 1 : 0], battle.defaultBounds.x1 + (battle.defaultBounds.x2 - battle.defaultBounds.x1) / 2 - 300 / 2 + shake, 0, 300, 300);

        if(this.state == STATE_ATTACKING)
            _ctx.globalAlpha = 1;
    }
}

class TypeWriter
{
    constructor(_showClickToContinueTip = true)
    {
        this.text = ['* Пора проснуться и почувствовать запах БОЛИ.'];

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
        this.speedNextLine = 25;
    }

    SetText(_text)
    {
        this.text = [..._text];
        
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

    PointerUp(e)
    {
        this.clickedAtLeastOnce = true;

        if(!this.lineFinished)
        {
            this.value = this.text[this.index].length;
            this.FinishLine();
            return;
        }

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
    FinishLine()
    {
        this.lineFinished = true;
    }

    Render(_ctx, _dt)
    {
        _ctx.font = '36px Arial';
        _ctx.fillStyle = '#000';
        _ctx.textBaseline = 'top';
        _ctx.textAlign = 'left';

        Utils.MultiLineText(_ctx, this.GetText(), battle.defaultBounds.x1 + 25, battle.defaultBounds.y1 + 25);

        if(this.stuckTimer <= 0 && !this.clickedAtLeastOnce && this.showClickToContinueTip)
        {
            _ctx.font = '24px Arial';
            _ctx.fillStyle = '#777';
            _ctx.textBaseline = 'bottom';
            _ctx.textAlign = 'right';
            _ctx.fillText('Кликни, чтобы продолжить!', battle.defaultBounds.x2 - 25, battle.defaultBounds.y2 - 25);
        }
    }

    GameLoop()
    {
        if(this.finished || this.lineFinished)
        {
            if(this.stuckTimer > 0)
                this.stuckTimer--;
            
            return;
        }
        
        this.timer--;

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
                case ',':
                case '.':
                case '!':
                    this.timer = this.speedPunctuation;
                    break;

                case '\n':
                    this.timer = this.speedNextLine;
                    break;

                default:
                    this.timer = this.speed;
                    break;
            }

            this.value++;
        }
    }
}

class BattleUI
{
    constructor()
    {
    }

    Start()
    {
        this.clickTarget = null;
        this.buttons = [
            {name: 'АТАКА', mode: OWN_ATTACK, action: battle.OwnAttack.bind(battle)},
            {name: 'ДЕЙСТВИЕ', mode: ACT, action: battle.Act.bind(battle)},
        ];

        let w = (battle.defaultBounds.x2 - battle.defaultBounds.x1 - (this.buttons.length - 1) * 20) / this.buttons.length;
        for(let i in this.buttons)
        {
            this.buttons[i].x = battle.defaultBounds.x1 + i * (w + 20);
            this.buttons[i].w = w;
        }
    }

    TargetButton()
    {
        if(battle.mode.id != IDLE)
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
            if(target == this.buttons[i] || battle.mode.id == this.buttons[i].mode)
                _ctx.fillStyle = _ctx.strokeStyle = '#000';
            else if(battle.mode.id == IDLE)
                _ctx.fillStyle = _ctx.strokeStyle = '#666';
            else
                _ctx.fillStyle = _ctx.strokeStyle = '#aaa';

            _ctx.strokeRect(this.buttons[i].x, battle.defaultBounds.y2 + 70, this.buttons[i].w, 50);
            _ctx.fillText(this.buttons[i].name, this.buttons[i].x + this.buttons[i].w / 2, battle.defaultBounds.y2 + 70 + 25);
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
            new AttackMode(),
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

        this.enemySprite = new EnemySprite();
        this.enemyHP = 500;

        this.mousePos = {x: this.defaultBounds.x1, y: this.defaultBounds.y1};
        this.soul = new Soul(this.mousePos.x, this.mousePos.y);
        this.hp = 100;
        this.tp = 0;

        this.attacks = [new FallAttack(), new AssAttack(), new CockAttack()];
        this.attack = null;
        this.attackCounter = -1;

        this.projectiles = [];

        this.SetMode(IDLE);
        this.render = requestAnimationFrame(this.Render.bind(this));
        this.gameLoop = setInterval(this.GameLoop.bind(this), 1000 / 60);
    }

    Start()
    {
        this.ui.Start();
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
        this.enemySprite.Render(this.ctx, _dt);

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
        this.ctx.fillText(`${this.hp}/100 ${this.tp}`, this.defaultBounds.x1, this.defaultBounds.y2 + 10);

        this.ctx.textBaseline = 'bottom';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`${this.enemyHP}/500`, this.defaultBounds.x2, this.defaultBounds.y1 - 10);
        
        // текущий режим
        this.mode.Render(this.ctx, _dt);

        // кнопки
        this.ui.Render(this.ctx, _dt);

        // душа, проджектайлы и атака
        this.soul.Render(this.ctx, _dt);

        for(let i in this.projectiles)
        {
            this.projectiles[i].Render(this.ctx, _dt);
        }

        if(this.attack != null)
            this.attack.Render(this.ctx, _dt);
    }
    GameLoop()
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

        this.mode.GameLoop();

        if(this.attack != null)
        {
            this.attack.GameLoop();

            for(let i in this.projectiles)
            {
                this.projectiles[i].GameLoop();
            }

            for(let i = this.projectiles.length - 1; i >= 0; i--)
            {
                let projectile = this.projectiles[i];

                if(projectile.toDestroy)
                {
                    this.DestroyProjectile(i);
                    continue;
                }

                if(projectile.Collision(false))
                {
                    this.Hurt(projectile.damage);
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

        this.soul.GameLoop();
    }

    Attack()
    {
        if(this.mode.id == GAME_OVER)
            return;

        this.SetMode(ATTACK);
        this.ResetBounds();

        this.attackCounter++;
        this.attack = this.attacks[this.attackCounter % this.attacks.length];
        this.attack.Start();
    }
    OwnAttack()
    {
        if(this.mode.id == GAME_OVER)
            return;

        this.SetMode(OWN_ATTACK);
    }
    Act()
    {
        if(this.mode.id == GAME_OVER)
            return;

        this.SetMode(ACT);
    }
    Idle()
    {
        if(this.mode.id == GAME_OVER)
            return;
        
        this.SetMode(IDLE);
        this.ResetBounds();
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
        
        if(_id == ATTACK)
            this.enemySprite.SetAnimation(STATE_ATTACKING, 0);
        else
            this.enemySprite.SetAnimation(STATE_NORMAL, 0);
    }

    AddProjectile(_projectile)
    {
        _projectile.Start();
        this.projectiles.push(_projectile);
    }
    DestroyProjectile(i)
    {
        this.projectiles.splice(i, 1);
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

        if(this.mode.id == ATTACK || this.mode.id == OWN_ATTACK)
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

        if(this.mode.id == ATTACK || this.mode.id == OWN_ATTACK)
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

        this.tp++;
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

    DealDamage(_damage)
    {
        this.enemyHP -= _damage;
        if(this.enemyHP < 0)
            this.enemyHP = 0;
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

    GameLoop()
    {
        if(this.invinsibleTimer > 0)
        {
            this.invinsibleTimer--;

            if(this.invinsibleTimer <= 0)
                this.invinsible = false;
        }

        this.x = Utils.Lerp(this.x, this.targetPos.x, 0.5);
        this.y = Utils.Lerp(this.y, this.targetPos.y, 0.5);

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

    static MultiLineText(_ctx, _text, _x, _y)
    {
        let lines = _text.split('\n');

        let metrics = _ctx.measureText(_text);
        let h = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;

        for(let i = 0; i < lines.length; i++)
        {
            _ctx.fillText(lines[i], _x, _y + h * i);
        }
    }
}

window.addEventListener('load', () =>
{
    battle = new Battle();
    battle.Start();
});