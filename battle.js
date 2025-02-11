var battle;

const   IDLE = 0,
        ATTACK = 1,
        OWN_ATTACK = 2;

class Battle
{
    constructor()
    {
        this.canvas = document.querySelector('#battle');
        this.ctx    = this.canvas.getContext('2d');

        this.mode = IDLE;

        window.addEventListener('click', this.Click.bind(this));
        window.addEventListener('pointermove', this.PointerMove.bind(this));

        this.bounds = {x1: 200, y1: 300, x2: 1080, y2: 550};

        this.hp = 100;

        this.soul = new Soul(this.bounds.x1, this.bounds.y1);

        this.attacks = [new Attack(30, 200), new AssAttack()];
        this.attack = null;

        this.buttons = [
            {name: 'die', action: this.Attack.bind(this)},
            {name: 'die', action: this.Attack.bind(this)},
            {name: 'die', action: this.Attack.bind(this)},
            {name: 'own', action: this.OwnAttack.bind(this)},
        ];

        let w = (this.bounds.x2 - this.bounds.x1 - (this.buttons.length - 1) * 20) / this.buttons.length;
        for(let i in this.buttons)
        {
            this.buttons[i].x = this.bounds.x1 + i * (w + 20);
            this.buttons[i].w = w;
        }

        this.projectiles = [];

        this.render = requestAnimationFrame(this.Render.bind(this));
        this.gameLoop = setInterval(this.GameLoop.bind(this), 1000 / 60);
    }

    Render(_dt)
    {
        this.render = requestAnimationFrame(this.Render.bind(this));

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(this.bounds.x1, this.bounds.y1, this.bounds.x2 - this.bounds.x1, this.bounds.y2 - this.bounds.y1);
        
        this.ctx.font = '36px serif';
        this.ctx.textBaseline = 'top';
        this.ctx.fillStyle = '#000';
        this.ctx.fillText(`${this.hp}/100 ${this.attack ? this.attack.attackTimer : ''}`, this.bounds.x1, this.bounds.y2 + 10);

        this.ctx.lineWidth = 5;

        if(this.mode == IDLE)
        {
            this.ctx.strokeStyle = '#000';
            this.ctx.fillStyle = '#000';
        }
        else
        {
            this.ctx.strokeStyle = '#AAA';
            this.ctx.fillStyle = '#AAA';
        }

        for(let i in this.buttons)
        {
            this.ctx.strokeRect(this.buttons[i].x, this.bounds.y2 + 70, this.buttons[i].w, 50);
            this.ctx.fillText(this.buttons[i].name, this.buttons[i].x, this.bounds.y2 + 70);
        }

        this.soul.Render(this.ctx);

        for(let i in this.projectiles)
        {
            this.projectiles[i].Render(this.ctx);
        }
    }
    GameLoop()
    {
        if(this.attack != null)
        {
            this.attack.GameLoop();

            for(let i in this.projectiles)
            {
                this.projectiles[i].Update();
            }

            for(let i = this.projectiles.length - 1; i >= 0; i--)
            {
                let projectile = this.projectiles[i];
                if(projectile.Collision(this.soul))
                {
                    if(!this.soul.invinsible)
                    {
                        this.soul.Hurt();
                        this.hp -= projectile.damage;
                    }
                    
                    this.projectiles.splice(i, 1);
                }
                else if(projectile.x + projectile.w < 0 || projectile.y + projectile.h < 0 || projectile.x - projectile.w > this.canvas.width || projectile.y - projectile.h > this.canvas.height)
                {
                    this.projectiles.splice(i, 1);
                }
            }
        }

        this.soul.Update();
    }

    Attack()
    {
        this.mode = ATTACK;
        this.attack = Utils.RandomArray(this.attacks);
        this.attack.Start();
    }
    OwnAttack()
    {
        this.mode = OWN_ATTACK;
    }
    Idle()
    {
        this.mode = IDLE;
        this.attack = null;
        this.projectiles = [];
    }

    AddProjectile(_projectile)
    {
        this.projectiles.push(_projectile);
    }

    Click(e)
    {
        if(this.mode != IDLE)
            return;

        let pos = Utils.MousePos(e, this.canvas);
        if(pos.y >= this.bounds.y2 + 70 && pos.y <= this.bounds.y2 + 70 + 50)
        {
            for(let i in this.buttons)
            {
                if(pos.x >= this.buttons[i].x && pos.x <= this.buttons[i].x + this.buttons[i].w)
                {
                    this.buttons[i].action();
                    this.PointerMove(e);
                    return;
                }
            }
        }
    }

    PointerMove(e)
    {
        let pos = Utils.MousePos(e, this.canvas);

        if(this.mode == ATTACK)
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

        this.soul.x = pos.x;
        this.soul.y = pos.y;
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

    Render(_ctx)
    {
        _ctx.save();
        _ctx.translate(this.x + this.pivot.x, this.y + this.pivot.y);
        _ctx.rotate(this.rotation);

        this.Draw(_ctx);

        _ctx.restore();
    }

    Draw(_ctx)
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

    Update()
    {
        if(this.invinsibleTimer > 0)
        {
            this.invinsibleTimer--;

            if(this.invinsibleTimer == 0)
                this.invinsible = false;
        }
    }

    Render(_ctx)
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

    static RotatePoint(_point, _center, _angle)
    {
        let cos = Math.cos(_angle);
        let sin = Math.sin(_angle);
    
        return {
            x: _center.x + (_point.x - _center.x) * cos - (_point.y - _center.y) * sin, 
            y: _center.y + (_point.x - _center.x) * sin + (_point.y - _center.y) * cos 
        };
    }
}

window.addEventListener('load', () =>
{
    battle = new Battle();
});