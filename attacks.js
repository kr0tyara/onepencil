class Attack
{
    constructor(_projectileTime, _attackTime)
    {
        this.tickCount = 0;
        this.projectileTime = _projectileTime;
        this.attackTime = _attackTime;

        this.startTime = 20;
        this.endTime = 20;
    }

    Start()
    {
        this.tickCount = 0;

        this.projectileTimer = 0;
        this.attackTimer = this.attackTime;
        this.startTimer = this.startTime;
        this.endTimer = this.endTime;
    }

    End()
    {
        battle.Idle();
    }

    Render(_ctx, _dt)
    {

    }

    GameLoop()
    {
        if(!battle.boundsReady)
            return;

        if(this.startTimer > 0)
        {
            this.startTimer--;
            if(this.startTimer > 0)
                return;
        }

        this.attackTimer--;
        if(this.attackTimer <= 0)
        {
            if(this.attackTimer == 0)
                this.OnTimeOut();

            if(battle.projectiles.length == 0)
            {
                this.endTimer--;
                if(this.endTimer <= 0)
                    this.End();
            }

            return;
        }

        this.projectileTimer--;
        if(this.projectileTimer <= 0)
        {
            this.tickCount++;
            this.SpawnProjectile(this.tickCount);
            this.projectileTimer = this.projectileTime;
        }

        this.OnGameLoop();
    }


    OnTimeOut()
    {
    }
    OnGameLoop()
    {
    }

    SpawnProjectile(_tickCount)
    {
    }
}
class Projectile extends Entity
{
    constructor(_x, _y, _w, _h, _damage)
    {
        super(_x, _y, _w, _h);
        this.damage = _damage;

        this.speed = 5;

        this.honingTime = 0;
        this.honingTimer = 0;

        this.toDestroy = false;
    }

    Start()
    {
        this.honingTimer = this.honingTime;
    }

    Collision(_point)
    {
        if(this.honingTimer > 0)
            return false;

        let rotatedPoint = Utils.RotatePoint(_point, {x: this.x + this.pivot.x, y: this.y + this.pivot.y}, -this.rotation);
        this.rot = rotatedPoint;

        if(
            rotatedPoint.x < this.x + this.w &&
            rotatedPoint.x > this.x &&
            rotatedPoint.y < this.y + this.h &&
            rotatedPoint.y > this.y
        )
        {
            return true;
        }

        return false;
    }

    Draw(_ctx, _dt)
    {
        _ctx.fillStyle = 'red';
        _ctx.fillRect(-this.pivot.x, -this.pivot.y, this.w, this.h);

        /*_ctx.fillStyle = 'blue';
        _ctx.fillRect(-5, -5, 10, 10);*/
    }

    GameLoop()
    {
        if(this.honingTimer > 0)
            this.honingTimer--;
    }
}

class FallAttack extends Attack
{
    constructor()
    {
        super(30, 200);
    }

    Start()
    {
        super.Start();
        //battle.SetBounds(100, 1180, 0, 720);
    }

    SpawnProjectile(_tickCount)
    {
        let projectile = new FallProjectile(Utils.Random(battle.soul.x - 10, battle.soul.x + 10), Utils.Random(battle.soul.y - 300, battle.soul.y - 150));
        battle.AddProjectile(projectile);
    }
}
class FallProjectile extends Projectile
{
    constructor(_x, _y)
    {
        super(_x, _y, 50, 75, 10);

        this.speed = 7;
        this.honingTime = 50;
    }

    GameLoop()
    {
        super.GameLoop();

        if(this.honingTimer > 0)
            return;
        
        this.rotation += Math.PI / 60;
        this.y += this.speed;
    }
}

class AssAttack extends Attack
{
    constructor()
    {
        super(40, 300);
    }
    
    SpawnProjectile(_tickCount)
    {
        let center = {x: battle.bounds.x1 + (battle.bounds.x2 - battle.bounds.x1) / 2, y: battle.bounds.y1 + (battle.bounds.y2 - battle.bounds.y1) / 2};

        let angle = Utils.Random(0, Math.PI * 2);
        let projectile = new AssProjectile(center.x + Math.cos(angle) * 500, center.y + Math.sin(angle) * 200);
        battle.AddProjectile(projectile);
    }
}
class AssProjectile extends Projectile
{
    constructor(_x, _y)
    {
        super(_x, _y, 25, 80, 10);

        this.speed = 40;
        this.honingTime = 50;

        this.pivot.y = this.h;

        let delta = {x: battle.soul.x - this.x - this.pivot.x, y: battle.soul.y - this.y - this.pivot.y};
        this.angle = Math.atan2(delta.y, delta.x);
        this.rotation = this.angle - Math.PI / 2;
    }

    GameLoop()
    {
        super.GameLoop();

        if(this.honingTimer > 0)
            return;
        
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
    }
}

class CockAttack extends Attack
{
    constructor()
    {
        super(30, 400);
    }
    
    Start()
    {
        super.Start();

        battle.SetBounds({x1: 500, y1: 300, x2: 780, y2: 550});
        
        this.speed = 5;
        this.drawer = {x: battle.bounds.x1 + (battle.bounds.x2 - battle.bounds.x1) / 2, y: battle.bounds.y1 + (battle.bounds.y2 - battle.bounds.y1) / 2};
        this.lastPos = {x: this.drawer.x, y: this.drawer.y};
        this.SetAngle();
    }

    SetAngle()
    {
        let delta = {x: battle.soul.x - this.drawer.x, y: battle.soul.y - this.drawer.y};
        this.angle = Math.atan2(delta.y, delta.x);
    }

    SpawnProjectile(_tickCount)
    {
        if(_tickCount % 2 == 0)
        {
            this.SetAngle();
        }
    }

    Render(_ctx, _dt)
    {
        _ctx.save();

        _ctx.translate(this.drawer.x, this.drawer.y);
        _ctx.rotate(this.angle);

        _ctx.fillStyle = 'green';
        _ctx.fillRect(-10, -30, 40, 70);

        _ctx.restore();
    }

    OnGameLoop()
    {
        this.drawer.x += Math.cos(this.angle) * this.speed;
        this.drawer.y += Math.sin(this.angle) * this.speed;

        if(Utils.Distance(this.drawer, this.lastPos) >= 12)
        {
            let projectile = new CockProjectile(this.drawer.x, this.drawer.y);
            battle.AddProjectile(projectile);

            this.lastPos.x = this.drawer.x;
            this.lastPos.y = this.drawer.y;
        }
    }

    OnTimeOut()
    {
        for(let i in battle.projectiles)
        {
            battle.projectiles[i].lifeTimer = i;
        }
    }
}
class CockProjectile extends Projectile
{
    constructor(_x, _y)
    {
        super(_x, _y, 25, 25, 10, 0);

        this.lifeTime = 150;
    }

    Start()
    {
        super.Start();
        this.lifeTimer = this.lifeTime;
    }

    GameLoop()
    {
        super.GameLoop();

        if(this.honingTimer > 0)
            return;

        this.lifeTimer--;
        if(this.lifeTimer <= 0)
        {
            this.toDestroy = true;
        }
    }
}