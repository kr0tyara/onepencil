var battle;

class Battle
{
    constructor()
    {
        this.canvas = document.querySelector('#battle');
        this.ctx    = this.canvas.getContext('2d');

        window.addEventListener('pointermove', this.PointerMove.bind(this));

        this.bounds = {x1: 200, y1: 300, x2: 1080, y2: 600};

        this.hp = 100;

        this.soul = new Soul(this.bounds.x1, this.bounds.y1);

        this.projectiles = [];

        this.attacks = [new AssAttack()];
        this.attack = this.attacks[0];

        this.render = requestAnimationFrame(this.Render.bind(this));
        this.gameLoop = setInterval(this.GameLoop.bind(this), 1000 / 60);
    }

    Render(_dt)
    {
        this.render = requestAnimationFrame(this.Render.bind(this));

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.lineStyle = '#000';
        this.ctx.strokeRect(this.bounds.x1, this.bounds.y1, this.bounds.x2 - this.bounds.x1, this.bounds.y2 - this.bounds.y1);
        
        this.ctx.font = '36px serif';
        this.ctx.textBaseline = 'top';
        this.ctx.fillStyle = '#000';
        this.ctx.fillText(`${this.hp}/100`, this.bounds.x1, this.bounds.y2 + 10);

        this.soul.Render(this.ctx);

        for(let i in this.projectiles)
        {
            this.projectiles[i].Render(this.ctx);
        }
    }
    GameLoop()
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

        this.soul.Update();
    }

    AddProjectile(_projectile)
    {
        this.projectiles.push(_projectile);
    }

    PointerMove(e)
    {
        let pos = Utils.MousePos(e, this.canvas);

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

        this.soul.x = pos.x;
        this.soul.y = pos.y;
    }
}

class Entity
{
    constructor(_x, _y, _w, _h)
    {
        this.x = _x - _w / 2;
        this.y = _y;
        this.w = _w;
        this.h = _h;
    }

    Render(_ctx)
    {
        _ctx.fillStyle = '#000';
        _ctx.fillRect(this.x, this.y, this.w, this.h);
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