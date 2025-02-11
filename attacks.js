class Attack
{
    constructor(_projectileTime)
    {
        this.projectileTime = _projectileTime;
        this.projectileTimer = 0;
    }

    GameLoop()
    {
        this.projectileTimer -= 1;
        if(this.projectileTimer <= 0)
        {
            this.SpawnProjectile();
            this.projectileTimer = this.projectileTime;
        }
    }

    SpawnProjectile()
    {
        let projectile = new Projectile(Utils.Random(battle.soul.x - 10, battle.soul.x + 10), Utils.Random(battle.soul.y - 300, battle.soul.y - 150), 25, 25, 10, 2);
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

        this.rotation = 0;
    }

    Collision(_point)
    {
        let rotatedPoint = Utils.RotatePoint(_point, {x: this.x, y: this.y}, -this.rotation);

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

    Render(_ctx)
    {
        /*_ctx.fillStyle = '#ff0000';
        _ctx.fillRect(this.x, this.y, this.w, this.h);*/

        _ctx.save();
        _ctx.translate(this.x, this.y);
        _ctx.rotate(this.rotation);

        _ctx.fillStyle = 'green';
        _ctx.fillRect(0, 0, this.w, this.h);

        _ctx.restore();
    }

    Update()
    {
        this.y += this.speed;
    }
}

class AssAttack extends Attack
{
    constructor()
    {
        super(30);
    }
    
    SpawnProjectile()
    {
        let angle = Utils.Random(0, Math.PI * 2);
        let center = {x: battle.bounds.x1 + (battle.bounds.x2 - battle.bounds.x1) / 2, y: battle.bounds.y1 + (battle.bounds.y2 - battle.bounds.y1) / 2};

        let projectile = new AssProjectile(center.x + Math.cos(angle) * 700, center.y + Math.sin(angle) * 400);
        battle.AddProjectile(projectile);
    }
}
class AssProjectile extends Projectile
{
    constructor(_x, _y)
    {
        super(_x, _y, 25, 250, 10, 30);

        this.honingTime = 50;
        this.honingTimer = this.honingTime;

        let delta = {x: battle.soul.x - this.x - this.w / 2, y: battle.soul.y - this.y};
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