class Attack
{
    constructor(_projectileTime, _attackTime)
    {
        this.tickCount = 0;
        this.projectileTime = _projectileTime;
        this.attackTime = _attackTime;
    }

    Start()
    {
        this.tickCount = 0;
        this.projectileTimer = 0;
        this.attackTimer = this.attackTime;
    }

    Render(_ctx)
    {

    }

    GameLoop()
    {
        this.attackTimer--;
        if(this.attackTimer == 0)
        {
            battle.Idle();
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

    OnGameLoop()
    {

    }

    SpawnProjectile(_tickCount)
    {
        let projectile = new Projectile(Utils.Random(battle.soul.x - 10, battle.soul.x + 10), Utils.Random(battle.soul.y - 300, battle.soul.y - 150), 50, 75, 10, 7);
        battle.AddProjectile(projectile);
    }
}
class Projectile extends Entity
{
    constructor(_x, _y, _w, _h, _damage, _speed)
    {
        super(_x, _y, _w, _h);
        this.damage = _damage;
        this.speed = _speed;
    }

    Collision(_point)
    {
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

    Draw(_ctx)
    {
        _ctx.fillStyle = 'red';
        _ctx.fillRect(-this.pivot.x, -this.pivot.y, this.w, this.h);

        /*_ctx.fillStyle = 'blue';
        _ctx.fillRect(-5, -5, 10, 10);*/
    }

    Update()
    {
        this.y += this.speed;
        this.rotation += Math.PI / 60;
    }
}

class AssAttack extends Attack
{
    constructor()
    {
        super(20, 300);
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
        super(_x, _y, 25, 80, 10, 50);

        this.honingTime = 50;
        this.honingTimer = this.honingTime;

        this.pivot.y = this.h;

        let delta = {x: battle.soul.x - this.x - this.pivot.x, y: battle.soul.y - this.y - this.pivot.y};
        this.angle = Math.atan2(delta.y, delta.x);
        this.rotation = this.angle - Math.PI / 2;
    }

    Collision(_point)
    {
        if(this.honingTimer > 0)
            return;

        return super.Collision(_point);
    }

    Update()
    {
        if(this.honingTimer > 0)
        {
            this.honingTimer--;
            return;
        }

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

    Render(_ctx)
    {
        _ctx.fillStyle = 'red';
        _ctx.fillRect(this.drawer.x - 10, this.drawer.y - 50, 20, 50);
    }

    OnGameLoop()
    {
        this.drawer.x += Math.cos(this.angle) * this.speed;
        this.drawer.y += Math.sin(this.angle) * this.speed;

        if(Utils.Distance(this.drawer, this.lastPos) >= 5)
        {
            let projectile = new Projectile(this.drawer.x, this.drawer.y, 10, 10, 10, 0);
            battle.AddProjectile(projectile);

            this.lastPos.x = this.drawer.x;
            this.lastPos.y = this.drawer.y;
        }
    }
}