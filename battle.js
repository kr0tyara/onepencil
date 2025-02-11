var battle;

const   IDLE = 0,
        ATTACK = 1,
        OWN_ATTACK = 2,
        GAME_OVER = 3,
        
        ATTACK_NONE = 0,
        ATTACK_CIRCLE = 1,
        ATTACK_TRIANGLE = 2,
        ATTACK_STAR = 3;

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

        this.attacked = false;
        this.shakeDistance = 0;
    }

    SetAnimation(_attacked, _time)
    {
        this.attacked = _attacked;

        if(_attacked)
            this.shakeDistance = 20 * _time;
        else
            this.shakeDistance = 0;
    }

    Render(_ctx, _dt)
    {
        let shake = Math.sin(_dt / 20) * this.shakeDistance;

        // утка
        _ctx.drawImage(this.sprites[this.attacked ? 1 : 0], battle.bounds.x1 + (battle.bounds.x2 - battle.bounds.x1) / 2 - 300 / 2 + shake, 0, 300, 300);
    }
}

class BattleUI
{
    constructor()
    {
    }

    Start()
    {
        this.buttons = [
            {name: 'АТАКА', action: battle.OwnAttack.bind(battle)},
        ];

        let w = (battle.bounds.x2 - battle.bounds.x1 - (this.buttons.length - 1) * 20) / this.buttons.length;
        for(let i in this.buttons)
        {
            this.buttons[i].x = battle.bounds.x1 + i * (w + 20);
            this.buttons[i].w = w;
        }
    }

    Click(e)
    {
        let pos = Utils.MousePos(e, battle.canvas);

        if(pos.y >= battle.bounds.y2 + 70 && pos.y <= battle.bounds.y2 + 70 + 50)
        {
            for(let i in this.buttons)
            {
                if(pos.x >= this.buttons[i].x && pos.x <= this.buttons[i].x + this.buttons[i].w)
                {
                    this.buttons[i].action();
                    battle.PointerMove(e);
                    return;
                }
            }
        }
    }

    Render(_ctx, _dt)
    {
        _ctx.lineWidth = 5;
        if(battle.mode.id == IDLE)
        {
            _ctx.strokeStyle = '#000';
            _ctx.fillStyle = '#000';
        }
        else
        {
            _ctx.strokeStyle = '#aaa';
            _ctx.fillStyle = '#aaa';
        }

        _ctx.font = '36px Arial';
        _ctx.textBaseline = 'middle';
        _ctx.textAlign = 'center';
        for(let i in this.buttons)
        {
            _ctx.strokeRect(this.buttons[i].x, battle.bounds.y2 + 70, this.buttons[i].w, 50);
            _ctx.fillText(this.buttons[i].name, this.buttons[i].x + this.buttons[i].w / 2, battle.bounds.y2 + 70 + 25);
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
            new GameOverMode()
        ];
        this.mode = this.modes[IDLE];

        this.canvas.addEventListener('click', this.Click.bind(this));
        this.canvas.addEventListener('pointerdown', this.PointerDown.bind(this));
        window.addEventListener('pointermove', this.PointerMove.bind(this));
        window.addEventListener('pointerup', this.PointerUp.bind(this));

        this.bounds = {x1: 200, y1: 300, x2: 1080, y2: 550};
        this.ui = new BattleUI();

        this.enemySprite = new EnemySprite();
        this.enemyHP = 500;

        this.soul = new Soul(this.bounds.x1, this.bounds.y1);
        this.hp = 100;

        this.attacks = [new Attack(30, 200), new AssAttack(), new CockAttack()];
        this.attack = null;
        this.projectiles = [];

        this.render = requestAnimationFrame(this.Render.bind(this));
        this.gameLoop = setInterval(this.GameLoop.bind(this), 1000 / 60);
    }

    Start()
    {
        this.ui.Start();
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
        this.ctx.lineWidth = 5;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
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
        this.ctx.fillText(`${this.hp}/100`, this.bounds.x1, this.bounds.y2 + 10);

        this.ctx.textBaseline = 'bottom';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`${this.enemyHP}/500`, this.bounds.x2, this.bounds.y1 - 10);
        
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
                if(projectile.Collision(this.soul))
                {
                    this.Hurt(projectile.damage);                    
                    this.projectiles.splice(i, 1);
                }
                else if(
                    projectile.x + projectile.w < 0 ||
                    projectile.y + projectile.h < 0 ||
                    projectile.x - projectile.w > this.canvas.width ||
                    projectile.y - projectile.h > this.canvas.height
                )
                    this.projectiles.splice(i, 1);
            }
        }

        this.soul.GameLoop();
    }

    Attack()
    {
        if(this.mode.id == GAME_OVER)
            return;

        this.SetMode(ATTACK);

        this.attack = Utils.RandomArray(this.attacks);
        this.attack.Start();
    }
    OwnAttack()
    {
        if(this.mode.id == GAME_OVER)
            return;

        this.SetMode(OWN_ATTACK);
    }
    Idle()
    {
        if(this.mode.id == GAME_OVER)
            return;
        
        this.SetMode(IDLE);
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
    }

    AddProjectile(_projectile)
    {
        this.projectiles.push(_projectile);
    }

    Click(e)
    {
        this.mode.Click(e);
    }

    PointerDown(e)
    {
        this.mode.PointerDown(e);
    }
    PointerUp(e)
    {
        this.mode.PointerUp(e);
    }

    PointerMove(e)
    {
        let pos = Utils.MousePos(e, this.canvas);

        if(this.mode.id == ATTACK || this.mode.id == OWN_ATTACK)
        {
            if(
                pos.x >= this.bounds.x1 && pos.x <= this.bounds.x2 &&
                pos.y >= this.bounds.y1 && pos.y <= this.bounds.y2
            )
                this.canvas.style.cursor = 'none';
            else
                this.canvas.style.cursor = '';

            if(pos.x < this.bounds.x1)
                pos.x = this.bounds.x1;
            if(pos.x > this.bounds.x2 - this.soul.w)
                pos.x = this.bounds.x2 - this.soul.w;

            if(pos.y < this.bounds.y1)
                pos.y = this.bounds.y1;
            if(pos.y > this.bounds.y2 - this.soul.h)
                pos.y = this.bounds.y2 - this.soul.h;
        }
        else
            this.canvas.style.cursor = 'none';

        this.soul.x = pos.x;
        this.soul.y = pos.y;

        this.mode.PointerMove(e);
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
    }

    Render(_ctx, _dt)
    {
        if(this.invinsible && this.invinsibleTimer % 10 < 4)
        {
            _ctx.globalAlpha = 0.5;
        }

        _ctx.drawImage(this.sprite, this.x, this.y);

        if(this.invinsible)
        {
            _ctx.globalAlpha = 1;
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

    static Distance(_a, _b)
    {
        let d = {x: _a.x - _b.x, y: _a.y - _b.y};
        return Math.sqrt(d.x * d.x + d.y * d.y);
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