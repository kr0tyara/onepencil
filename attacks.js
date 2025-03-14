class Attack
{
    constructor(_caster, _difficulty, _projectileTime, _attackTime)
    {
        this.caster = _caster;
        this.difficulty = _difficulty;

        this.timeOut = false;
        this.tickCount = 0;

        this.projectileTime = _projectileTime;
        this.attackTime = _attackTime;

        this.startTime = 20;
        this.endTime = 20;

        this.x = this.caster.x + this.caster.pivot.x;
        this.y = this.caster.y + this.caster.pivot.y;
        this.spawnedProjectiles = [];

        this.startBounds = {x1: 515, y1: 300, x2: 765, y2: 550, a: 1};
    }

    Start()
    {
        this.timeOut = false;
        this.tickCount = 0;

        this.projectileTimer = 0;
        this.attackTimer = this.attackTime;
        this.startTimer = this.startTime;
        this.endTimer = this.endTime;

        battle.SetBounds(this.startBounds);
    }

    End()
    {
        battle.OnAttackEnd();
    }

    Render(_ctx, _dt)
    {

    }

    GameLoop(_delta)
    {
        if(!battle.boundsReady)
            return;

        if(this.startTimer > 0)
        {
            this.startTimer -= 1 * _delta;
            if(this.startTimer > 0)
                return;
        }

        this.attackTimer -= 1 * _delta;
        if(this.attackTimer <= 0)
        {
            if(!this.timeOut)
                this.OnTimeOut();

            if(this.spawnedProjectiles.length == 0)
            {
                this.endTimer -= 1 * _delta;
                if(this.endTimer <= 0)
                    this.End();
            }

            this.OnGameLoop(_delta);
            return;
        }

        this.projectileTimer -= 1 * _delta;
        if(this.projectileTimer <= 0)
        {
            this.tickCount++;
            this.SpawnProjectile(this.tickCount);
            this.projectileTimer = this.NextProjectileTime(this.tickCount);
        }

        this.OnGameLoop(_delta);
    }

    NextProjectileTime(_tickCount)
    {
        return this.projectileTime;
    }

    OnTimeOut()
    {
        this.timeOut = true;
    }
    Finish()
    {
        this.attackTimer = 0;
    }
    OnGameLoop(_delta)
    {
    }

    SpawnProjectile(_index)
    {
    }
}
class Projectile extends Entity
{
    constructor(_parent, _index, _x, _y, _w, _h, _damage)
    {
        super(_x, _y, _w, _h);

        this.onTop = false;

        this.parent = _parent;
        this.index = _index;

        this.damage = _damage;

        this.speed = 5;

        this.honingTime = 0;
        this.honingTimer = 0;
        
        this.lifeTimer = 0;

        this.destructible = true;
        this.toDestroy = false;
    }

    Start()
    {
        this.honingTimer = this.honingTime;
        this.lifeTimer = 0;
    }

    Collision(_graze)
    {
        if(this.honingTimer > 0)
            return false;

        let rotatedPoint = Utils.RotatePoint({x: battle.soul.x + battle.soul.pivot.x, y: battle.soul.y + battle.soul.pivot.y}, {x: this.x + this.pivot.x, y: this.y + this.pivot.y}, -this.rotation);
        let pos = 
        {
            x: Math.max(this.x, Math.min(rotatedPoint.x, this.x + this.w)),
            y: Math.max(this.y, Math.min(rotatedPoint.y, this.y + this.h))
        };
      
        if (Utils.Distance(pos, rotatedPoint) < (_graze ? battle.soul.grazeRadius : battle.soul.radius))
            return true;

        return false;
    }

    Draw(_ctx, _dt)
    {
        _ctx.fillStyle = 'red';
        _ctx.fillRect(-this.pivot.x, -this.pivot.y, this.w, this.h);

        /*_ctx.fillStyle = 'blue';
        _ctx.fillRect(-5, -5, 10, 10);*/
    }

    GameLoop(_delta)
    {
        if(this.honingTimer > 0)
            this.honingTimer -= 1 * _delta;

        this.lifeTimer += 1 * _delta;
    }
}

class TestAttack extends Attack
{
    constructor(_caster, _difficulty)
    {
        super(_caster, _difficulty, 30, 200);
    }

    SpawnProjectile(_index)
    {
        let projectile = new TestProjectile(this, _index, battle.bounds.x1 + (battle.bounds.x2 - battle.bounds.x1) / 2, battle.bounds.y1 + (battle.bounds.y2 - battle.bounds.y1) / 2);
        battle.AddProjectile(this, projectile);
    }
}
class TestProjectile extends Projectile
{
    constructor(_parent, _index, _x, _y)
    {
        super(_parent, _index, _x, _y, 100, 100, 10);
    }
}


class CardAttack extends Attack
{
    constructor(_caster, _difficulty)
    {
        super(_caster, _difficulty, 400, 400);
    }

    Start()
    {
        super.Start();

        let appearTime = 50;
        let count = 16;
        if(this.difficulty == 2)
            count = 12;

        let time = 30 + appearTime;
        for(let i = 0; i < count; i++)
        {
            let projectile = new CardProjectile(this, i, this.x, this.y);
            projectile.count = count;
            projectile.appearTime = appearTime;

            if(this.difficulty == 2)
                time += Utils.ReverseQuadratic(25, 40, i, count);
            else
                time += Utils.ReverseQuadratic(15, 30, i, count);
            projectile.honingTime = time;
            projectile.speed = Utils.Quadratic(7, 10, i, count);

            battle.AddProjectile(this, projectile);
        }
    }

    OnGameLoop(_delta)
    {
        super.OnGameLoop(_delta);
    }
}
class CardProjectile extends Projectile
{
    constructor(_parent, _index, _x, _y)
    {
        super(_parent, _index, _x, _y, 50, 75, 2);

        this.pivot.x = this.w / 2;
        this.x -= this.pivot.x;

        this.originalPos = {x: _x, y: _y};
        this.bounceCount = 0;

        this.count;
        this.appearTime;
        this.preThrowTime = 15;
        
        this.speed = 7;
        this.vy = 1;
    }

    Draw(_ctx, _dt)
    {
        _ctx.save();
        _ctx.rotate(Math.PI / 2);
        _ctx.drawImage(res.sprites.card, (this.parent.difficulty == 2 ? 90 : 0), 0, 90, 60, -this.pivot.y - 7.5, -this.pivot.x - 5, this.h + 15, this.w + 10);
        _ctx.restore();
    }

    GameLoop(_delta)
    {
        super.GameLoop(_delta);

        if(this.honingTimer > 0)
        {
            let cos = Math.cos((this.honingTime - this.honingTimer) / 25 - this.index / this.count) * 0.8 - 0.1;
            let targetX = cos * (100 + 50 * (this.honingTime - this.honingTimer) / this.honingTime);

            this.rotation = -cos / 5;

            // анимация появления
            if(this.honingTimer >= this.honingTime - this.appearTime)
            {
                let t = 1 - (this.honingTimer - (this.honingTime - this.appearTime)) / this.appearTime;
                this.x = this.originalPos.x + t * (targetX);
                this.y = this.originalPos.y - t * (this.index * 6);
                return;
            }

            // замах
            if(this.honingTimer > this.preThrowTime)
            {
                this.x = this.originalPos.x + targetX;
            }
            // анимация перед броском
            else
            {
                this.onTop = true;
                this.y = this.originalPos.y - this.index * 6 - 32 * ((this.preThrowTime - this.honingTimer) / this.preThrowTime);
            }

            return;
        }
        
        let speed = this.speed * _delta;
        if(this.speed > 0)
            speed *= this.vy;
        else
            speed += (_delta * this.vy) / 2;

        this.rotation += Math.PI / 60 * _delta * Math.abs(speed) / 15;
        this.y += speed;

        if(this.parent.difficulty == 2)
        {
            this.vy *= 1.03;

            if(this.y > battle.bounds.y2 && this.bounceCount < 1)
            {
                this.y = battle.bounds.y2;
                this.speed = -Math.min(8, Math.abs(this.speed));
                this.bounceCount++;
                this.vy = 3;
            }
        }
    }
}

class ThrowAttack extends Attack
{
    constructor(_caster, _difficulty)
    {
        super(_caster, _difficulty, 35, 300);

        if(this.difficulty == 2)
            this.projectileTime = 25;
    }
    
    SpawnProjectile(_index)
    {
        let center = {x: battle.bounds.x1 + (battle.bounds.x2 - battle.bounds.x1) / 2, y: battle.bounds.y1 + (battle.bounds.y2 - battle.bounds.y1) / 2};

        let angle = Utils.Random(0, Math.PI * 2);
        let projectile = new ThrowProjectile(this, _index, center.x + Math.cos(angle) * 250, center.y + Math.sin(angle) * 250);
        battle.AddProjectile(this, projectile);
    }
    NextProjectileTime(_tickCount)
    {
        if(_tickCount % 3 == 0)
            return this.projectileTime * 1.5;
        
        if(this.difficulty == 2)
            return 10;

        return super.NextProjectileTime(_tickCount);
    }
}
class ThrowProjectile extends Projectile
{
    constructor(_parent, _index, _x, _y)
    {
        super(_parent, _index, _x, _y, 25, 80, 3);

        this.speed = _index % 3 == 1 ? 15 : 30;
        this.honingTime = 50;

        this.pivot.y = 0;

        let delta = {x: battle.soul.x - this.x - this.pivot.x, y: battle.soul.y - this.y - this.pivot.y};
        this.angle = Math.atan2(delta.y, delta.x);
        this.rotation = this.angle - Math.PI / 2;

        this.origin = {x: this.x, y: this.y};
        this.targetPos = {x: -Math.cos(this.angle) * 75, y: -Math.sin(this.angle) * 75};
    }

    GameLoop(_delta)
    {
        super.GameLoop(_delta);

        if(this.honingTimer > 0)
        {
            this.onTop = true;

            this.x = this.origin.x + Utils.ReverseQuadratic(0, this.targetPos.x, this.honingTimer, this.honingTime);
            this.y = this.origin.y + Utils.ReverseQuadratic(0, this.targetPos.y, this.honingTimer, this.honingTime);
            
            return;
        }

        this.onTop = false;
        
        this.x += Math.cos(this.angle) * this.speed * _delta;
        this.y += Math.sin(this.angle) * this.speed * _delta;
    }

    Draw(_ctx, _dt)
    {
        if(this.honingTimer > 0)
            _ctx.globalAlpha = (this.honingTime - this.honingTimer) / this.honingTime;

        _ctx.drawImage(res.sprites.pencils, (this.index % 3) * 40, 0, 40, 120, -40 / 2, -this.pivot.y - 12, 40, 120);
        
        _ctx.globalAlpha = 1;
    }
}

class ScribbleAttack extends Attack
{
    constructor(_caster, _difficulty)
    {
        super(_caster, _difficulty, 15, 15);
    }

    Start()
    {
        super.Start();

        this.scribble = new ScribbleProjectile(this, 0, this.caster.x + 142 + 20, this.caster.y + 140 + 40, this.startBounds.x2 + 25, this.startBounds.y2 - 90);
        battle.AddProjectile(this, this.scribble);
    }
}
class ScribbleProjectile extends Projectile
{
    constructor(_parent, _index, _x, _y, _tx, _ty)
    {
        super(_parent, _index, _x, _y, 75, 75, 1);

        this.startPos = {x: _x, y: _y};
        this.targetPos = {x: _tx, y: _ty};

        this.honingTime = 30;
        this.destroyTime = 15;

        this.hop = 0;
    }

    Start()
    {
        super.Start();

        this.destroyTimer = this.destroyTime;
        this.destroyLaunch = false;

        res.sfx.scribble2.play();
    }

    GameLoop(_delta)
    {
        super.GameLoop(_delta);

        if(this.honingTimer > 0)
        {
            let pos = Utils.CurvePos(this.startPos, this.targetPos, 200, (this.honingTime - this.honingTimer) / this.honingTime)

            this.x = pos.x;
            this.y = pos.y;

            return;
        }

        if(this.lifeTimer % 25 < 1)
        {
            (this.hop % 2 == 0 ? res.sfx.hop2 : res.sfx.hop).play();
            this.hop++;
        }

        this.y = this.targetPos.y;

        this.x -= 1 * _delta;
        if(this.x <= battle.bounds.x1 - this.w)
        {
            this.destroyLaunch = true;
        }

        if(this.destroyLaunch)
        {
            this.destroyTimer -= 1 * _delta;
            
            if(this.destroyTimer <= 0)
                this.toDestroy = true;
        }
    }

    Draw(_ctx, _dt)
    {
        if(this.destroyLaunch)
            _ctx.globalAlpha = this.destroyTimer / this.destroyTime;

        _ctx.drawImage(res.sprites.scribble, this.honingTimer > 0 ? 4 * 114 : this.lifeTimer % 25 < 12 ? 0 : 114, 0, 114, 120, -this.pivot.x - 20, -this.pivot.y - 10, 114, 120);
        _ctx.globalAlpha = 1;
    }
}

class MouthAttack extends Attack
{
    constructor(_caster, _difficulty)
    {
        super(_caster, _difficulty, 50, 300);

        if(this.difficulty == 2)
            this.projectileTime = 20;
    }
    SpawnProjectile(_index)
    {
        let projectile = new MouthProjectile(this, _index, battle.soul.x - 32, battle.soul.y - 32);
        battle.AddProjectile(this, projectile);
    }

    NextProjectileTime()
    {
        return this.projectileTime;
    }
}
class MouthProjectile extends Projectile
{
    constructor(_parent, _index, _x, _y)
    {
        super(_parent, _index, _x, _y, 64, 64, 5);

        this.appearTime = 20;
        this.honingTime = 50;
        this.lifeTime = 100;
    }

    GameLoop(_delta)
    {
        super.GameLoop(_delta);

        if(this.lifeTimer > this.lifeTime)
            this.toDestroy = true;
    }

    Draw(_ctx, _dt)
    {
        if(this.honingTimer >= 0)
            _ctx.globalAlpha = (this.honingTime - this.honingTimer) / this.appearTime;
        else if(this.lifeTimer > this.lifeTime - this.appearTime)
            _ctx.globalAlpha = (this.lifeTime - this.lifeTimer) / this.appearTime;

        let t = (this.honingTime - this.honingTimer) / this.honingTime;

        _ctx.drawImage(res.sprites.eat, 0, 112, 108, 47, -70, 16, 108, 47);
        _ctx.drawImage(res.sprites.eat, 0, 0, 108, 86, -70, -64 - 50 * (1 - t), 108, 86);

        _ctx.globalAlpha = 1;
    }

    Collision(_graze)
    {
        if(this.lifeTimer > this.lifeTime - this.appearTime)
            return false;

        return super.Collision(_graze);
    }
}

class BallAttack extends Attack
{
    constructor(_caster, _difficulty)
    {
        super(_caster, _difficulty, 5, 300);

        this.startTime = 100;
        this.angle = 0;

        this.tails = 5;
        if(this.difficulty == 2)
            this.tails = 6;
        
        this.count = this.attackTime / this.projectileTime * this.tails;
    }
    
    Start()
    {
        super.Start();

        this.x = this.startBounds.x1 + (this.startBounds.x2 - this.startBounds.x1) / 2;
        this.y = this.startBounds.y1 + (this.startBounds.y2 - this.startBounds.y1) / 2;
    }

    OnGameLoop(_delta)
    {
        let tick = this.tickCount + (this.projectileTime - this.projectileTimer) / this.projectileTime;

        if(this.difficulty == 2)
            this.angle = Math.PI / Utils.ReverseQuadratic(18, 30, tick * this.tails, this.count) * tick;
        else
            this.angle = Math.PI / Utils.ReverseQuadratic(22, 36, tick * this.tails, this.count) * tick;
    }

    SpawnProjectile(_index)
    {
        for(let i = 0; i < this.tails; i++)
        {
            let index = _index * this.tails + i;
            let angle = this.angle + i * Math.PI / this.tails * 2;

            let projectile = new BallProjectile(this, index, this.x - 5, this.y - 5, angle);
            battle.AddProjectile(this, projectile);
        }
    }
    
    Render(_ctx, _dt)
    {
        super.Render(_ctx, _dt);

        _ctx.save();
        _ctx.translate(this.x, this.y - (this.y / 2) * this.startTimer / this.startTime);
        _ctx.rotate(this.angle - Math.PI / 7);
        _ctx.drawImage(res.sprites.star, -46 / 2, -48 / 2);
        _ctx.restore();
    }
}
class BallProjectile extends Projectile
{
    constructor(_parent, _index, _x, _y, _angle)
    {
        super(_parent, _index, _x, _y, 10, 10, 2);

        this.angle = _angle;
        this.speed = 4;
        
        this.lifeTime = 50;
        this.appearTime = 20;

        this.sprite = Utils.RandomRound(0, 5);
    }

    GameLoop(_delta)
    {
        super.GameLoop(_delta);

        this.x += Math.cos(this.angle) * this.speed * _delta;
        this.y += Math.sin(this.angle) * this.speed * _delta;

        if(this.lifeTimer > this.lifeTime)
            this.toDestroy = true;
    }

    Draw(_ctx, _dt)
    {
        if(this.lifeTimer > this.lifeTime - this.appearTime)
            _ctx.globalAlpha = (this.lifeTime - this.lifeTimer) / this.appearTime;

        _ctx.drawImage(res.sprites.chunks, 16 * this.sprite, 0, 16, 18, -8, -9, 16, 18);

        _ctx.globalAlpha = 1;
    }
}


/*
todo: переиспользовать для рисовалки!)
class ProfitAttack extends Attack
{
    constructor(_caster, _difficulty)
    {
        super(_caster, _difficulty, 300, 500);
    
        this.gapTime = 100;
        this.gapInsideTime = 15;
        this.offset = 45;

        this.currentProjectile = null;
    }
    
    Start()
    {
        super.Start();

        battle.SetBounds({x1: 200, y1: 300, x2: 1080, y2: 550});

        this.x = 400;
        this.y = 550;
        this.goingUp = true;
        
        this.changeAngleTimer = 0;
        this.gapTimer = 0;
        this.gapInsideTimer = 0;

        this.SetAngle();
    }

    SetAngle()
    {
        if(this.goingUp)
        {
            this.angle = Utils.Random(-Math.PI / 2, Math.PI / 6);

            if(this.y - battle.bounds.y1 <= this.offset)
                this.goingUp = false;
        }
        else
        {
            this.angle = Utils.Random(0, Math.PI / 2);

            if(battle.bounds.y2 - this.y <= this.offset)
                this.goingUp = true;
        }

        this.setAngleTimer = Utils.Random(5, 15);
    }
    AddLine()
    {
        this.currentProjectile = new ProfitProjectile(this, 0, this.x, this.y);
        this.currentProjectile.rotation = this.angle - Math.PI / 2;
        battle.AddProjectile(this, this.currentProjectile);
    }

    OnGameLoop(_delta)
    {
        this.setAngleTimer -= 1 * _delta;
        if(this.setAngleTimer <= 0 || this.y - battle.bounds.y1 <= this.offset || battle.bounds.y2 - this.y <= this.offset)
        {
            this.SetAngle();

            if(this.gapInsideTimer < 0)
                this.AddLine();
        }

        let speed = Utils.Quadratic(5, 10, this.attackTime - this.attackTimer, this.attackTime);
        this.x += Math.cos(this.angle) * _delta * speed;
        this.y += Math.sin(this.angle) * _delta * speed;
        
        this.gapTimer -= 1 * _delta;
        // продлеваем линию
        if(this.gapTimer > 0)
        {
            this.currentProjectile.h += _delta * speed;
        }
        // пора добавить дыру
        else if(this.gapInsideTimer <= 0)
        {
            this.gapInsideTimer = this.gapInsideTime;
        }
        // продлеваем дыру
        else
        {
            this.gapInsideTimer -= 1 * _delta;

            if(this.gapInsideTimer <= 0)
                this.gapTimer = this.gapTime;
        }

        if(this.x >= 640)
        {
            this.x -= speed / 4 * _delta;

            for(let i in this.spawnedProjectiles)
            {
                this.spawnedProjectiles[i].x -= speed / 4 * _delta;
            }
        }
    }

    Render(_ctx, _dt)
    {
        _ctx.lineWidth = 25;
        _ctx.strokeStyle = 'red';
        _ctx.beginPath();
        for(let i in this.spawnedProjectiles)
        {
            let projectile = this.spawnedProjectiles[i];
            _ctx.moveTo(projectile.x + projectile.pivot.x, projectile.y + projectile.pivot.y);
            
            let rotation = projectile.rotation + Math.PI / 2;
            let h = projectile.h - 10;
            _ctx.lineTo(projectile.x + projectile.pivot.x + Math.cos(rotation) * h, projectile.y + projectile.pivot.y + Math.sin(rotation) * h);
        }
        _ctx.stroke();
        _ctx.closePath();
    }
}

class ProfitProjectile extends Projectile
{
    constructor(_parent, _index, _x, _y)
    {
        super(_parent, _index, _x, _y, 25, 10, 1);

        this.pivot.x = this.w / 2;
        this.pivot.y = 0;
    }

    Render()
    {

    }
}
*/



/*
class FallAttack extends Attack
{
    constructor()
    {
        super(30, 200);
    }

    Start()
    {
        super.Start();
        battle.SetBounds({x1: 400, y1: 300, x2: 880, y2: 550});
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

    GameLoop(_delta)
    {
        super.GameLoop(_delta);

        if(this.honingTimer > 0)
            return;
        
        this.rotation += Math.PI / 60 * _delta;
        this.y += this.speed * _delta;
    }
}

class AssAttack extends Attack
{
    constructor()
    {
        super(40, 300);
    }

    Start()
    {
        super.Start();
        battle.SetBounds({x1: 400, y1: 300, x2: 880, y2: 550});
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

    GameLoop(_delta)
    {
        super.GameLoop(_delta);

        if(this.honingTimer > 0)
            return;
        
        this.x += Math.cos(this.angle) * this.speed * _delta;
        this.y += Math.sin(this.angle) * this.speed * _delta;
    }
}

class CockAttack extends Attack
{
    constructor()
    {
        super(30, 400);

        this.preTime = 30;
        this.preTimer = 0;
    }
    
    Start()
    {
        super.Start();

        this.preTimer = this.preTime;

        battle.SetBounds({x1: 500, y1: 300, x2: 780, y2: 550});
        
        this.speed = 3;
        this.drawer = {x: battle.bounds.x1 + (battle.bounds.x2 - battle.bounds.x1) / 2, y: battle.bounds.y1 + (battle.bounds.y2 - battle.bounds.y1) / 2 - 60};
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

    OnGameLoop(_delta)
    {
        if(this.preTimer >= 0)
        {
            this.preTimer -= _delta;

            this.drawer.y += 2 * _delta;

            return;
        }

        if(this.timeOut)
        {
            this.drawer.y -= 2 * _delta;
        }
        else
        {
            this.drawer.x += Math.cos(this.angle) * this.speed * _delta;
            this.drawer.y += Math.sin(this.angle) * this.speed * _delta;

            if(Utils.Distance(this.drawer, this.lastPos) >= 12)
            {
                let projectile = new CockProjectile(this.drawer.x, this.drawer.y);
                battle.AddProjectile(projectile);

                this.lastPos.x = this.drawer.x;
                this.lastPos.y = this.drawer.y;
            }
        }
    }

    OnTimeOut()
    {
        super.OnTimeOut();

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

    GameLoop(_delta)
    {
        super.GameLoop(_delta);

        if(this.honingTimer > 0)
            return;

        this.lifeTimer -= 1 * _delta;
        if(this.lifeTimer <= 0)
        {
            this.toDestroy = true;
        }
    }
}


class WheelAttack extends Attack
{
    constructor()
    {
        super(200, 600);
    }

    Start()
    {
        super.Start();

        battle.SetBounds({x1: 400, y1: 300, x2: 880, y2: 550});
    }

    SpawnProjectile(_tickCount)
    {
        let reverse = _tickCount > 2;
            
        let center = {x: battle.bounds.x1 - 250, y: battle.bounds.y1 + (battle.bounds.y2 - battle.bounds.y1) / 2 + 80 / 2};
        
        if(_tickCount % 2 == 0)
            center.x = battle.bounds.x1 - 125;
        
        if(reverse)
            center.x = battle.bounds.x2 + 250;

        for(let i = 0; i < 360; i += 30)
        {
            let angle = Math.PI * i / 180;
            let projectile = new WheelProjectile(center.x, center.y, angle);
            if(reverse)
                projectile.speed = -projectile.speed * 1.25;
            battle.AddProjectile(projectile);
        }
    }
}
class WheelProjectile extends Projectile
{
    constructor(_x, _y, _rotation)
    {
        super(_x, _y, 10, 100, 5);

        this.pivot.x = this.w / 2;
        this.pivot.y = -80;

        this.speed = 3;
        
        this.rotation = _rotation;
    }

    GameLoop(_delta)
    {
        super.GameLoop(_delta);

        this.x += this.speed * _delta;
        this.rotation += Math.sign(this.speed) * (Math.PI / 180) * _delta;
    }
}

class TeethAttack extends Attack
{
    constructor()
    {
        super(125, 375);

        this.sheet = new Image();
        this.sheet.src = './img/teeth2.png';
    }

    Start()
    {
        super.Start();

        this.timeOut = false;
        this.bite = 5;

        this.preBiteTime = 8;
        this.preBiteTimer = this.preBiteTime;
        this.biteTime = 15;
        this.biteTimer = this.biteTime;

        let bounds = {x1: 200, y1: 300, x2: 1080, y2: 550};
        battle.SetBounds(bounds);

        this.x = bounds.x2 + 75;
        this.teethA = new TeethProjectile(this.x, bounds.y2 - 100, true);
        this.teethB = new TeethProjectile(this.x, bounds.y2 - 50, false);
        this.teethC = new TeethMiddleProjectile(this.x + 150, this.teethA.y + this.teethA.h, this.teethB.y - this.teethB.h - this.teethA.y);
        
        battle.AddProjectile(this.teethA);
        battle.AddProjectile(this.teethB);
        battle.AddProjectile(this.teethC);
    }

    Render(_ctx, _dt)
    {
        if(!this.teethA || !this.teethB || !this.teethC)
            return;

        _ctx.drawImage(this.sheet, 0, 0, 235, 15, this.teethA.x - 56, this.teethA.y - 10, 235, 15);

        _ctx.drawImage(this.sheet, 194, 15, 41, 102, this.teethA.x + this.teethA.w - 13, this.teethB.y + this.teethB.h, 41, (this.teethA.y - 50 - this.teethB.y));

        _ctx.drawImage(this.sheet, 0, 117, 235, 36, this.teethB.x - 58, this.teethB.y + this.teethB.h, 235, 36);
    }

    OnGameLoop(_delta)
    {
        if(this.timeOut)
        {
            if(this.bite == 4)
            {
                this.teethA.broken = true;
                this.teethB.broken = true;
            }

            if(this.bite == 5)
            {
                this.Destroy();
                return;
            }
        }

        // перед укусом, откроем рот пошире
        if(this.bite == 1)
        {
            this.teethA.y -= 2 * _delta;
            
            if(this.teethA.y <= battle.bounds.y1)
            {
                this.teethA.y = battle.bounds.y1;
                
                this.bite = 2;
                this.preBiteTimer = this.biteTime;
            }
        }
        // выжидает
        else if(this.bite == 2)
        {
            this.preBiteTimer -= 1 * _delta;
            if(this.preBiteTimer <= 0)
                this.bite = 3;
        }
        // кусаю
        else if(this.bite == 3)
        {
            this.teethA.y += 12 * _delta;
            if(this.teethA.y >= this.teethB.y - 50)
            {
                this.teethA.y = this.teethB.y - 50;

                this.bite = 4;
                this.biteTimer = this.biteTime;
            }
        }
        // откусил, перед открытием рта
        else if(this.bite == 4)
        {
            this.biteTimer -= 1 * _delta;

            if(this.biteTimer <= 0)
                this.bite = 5;
        }
        // открываю рот
        else if(this.bite == 5)
        {
            this.teethA.y -= 4 * _delta;
            if(this.teethA.y <= battle.bounds.y1 + 30)
            {
                this.teethA.y = battle.bounds.y1 + 30;
                this.bite = 0;
            }
        }
        // бегаю за душой
        else
        {
            let targetX = battle.soul.x - 75;

            if(Math.abs(targetX - this.x) >= 8)
                this.x += Math.sign(targetX - this.x) * 5 * _delta;

            this.teethA.x = this.x;
            this.teethB.x = this.x;
            this.teethC.x = this.x + 150;
        }
        
        this.teethC.y = this.teethA.y + this.teethA.h;
        this.teethC.h = this.teethB.y - this.teethB.h - this.teethA.y;
    }
    SpawnProjectile(_tickCount)
    {
        if(_tickCount > 1 && this.bite == 0)
            this.bite = 1;
    }
    OnTimeOut()
    {
        super.OnTimeOut();
        this.bite = 1;
    }


    Destroy()
    {
        battle.DestroyProjectile(this.teethA);
        battle.DestroyProjectile(this.teethB);
        battle.DestroyProjectile(this.teethC);
        
        this.teethA = null;
        this.teethB = null;
        this.teethC = null;
    }
}
class TeethProjectile extends Projectile
{
    constructor(_x, _y, _upper)
    {
        super(_x, _y, 150, 50, 20);

        this.pivot.x = 0;
        this.pivot.y = 0;

        this.upper = _upper;
        this.broken = false;
        
        this.sheet = new Image();
        this.sheet.src = './img/teeth.png';

        this.destructible = false;
    }

    Draw(_ctx, _dt)
    {
        _ctx.drawImage(this.sheet, this.broken ? 180 : 0, this.upper ? 0 : 57, 180, 57, -15, 0, 180, 57);
    }
}
class TeethMiddleProjectile extends Projectile
{
    constructor(_x, _y, _h)
    {
        super(_x, _y, 30, _h, 50);

        this.destructible = false;
    }

    Render(_ctx, _dt)
    {
    }
}*/