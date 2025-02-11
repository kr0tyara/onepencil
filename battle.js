var battle;

const   IDLE = 0,
        ATTACK = 1,
        OWN_ATTACK = 2,
        GAME_OVER = 3,
        
        ATTACK_NONE = 0,
        ATTACK_CIRCLE = 1,
        ATTACK_TRIANGLE = 2,
        ATTACK_STAR = 3;

class Battle
{
    constructor()
    {
        this.canvas = document.querySelector('#battle');
        this.ctx    = this.canvas.getContext('2d');

        this.mode = IDLE;

        this.canvas.addEventListener('click', this.Click.bind(this));
        this.canvas.addEventListener('pointerdown', this.PointerDown.bind(this));
        window.addEventListener('pointermove', this.PointerMove.bind(this));
        window.addEventListener('pointerup', this.PointerUp.bind(this));

        this.bounds = {x1: 200, y1: 300, x2: 1080, y2: 550};

        let spr = [
            './img/duck.png',
            './img/duck2.png',
        ];
        this.enemySprites = [];
        for(let i in spr)
        {
            let img = new Image();
            img.src = spr[i];
            this.enemySprites.push(img);
        }
        this.enemyHP = 500;
        
        /*this.checkText = '* PromoDuck appears!';
        this.flavourText = [
            '* PromoDuck cleans his feathers.\n* He finds a bald spot.',
            '* 9/30000 Tooners recommend!',
            '* PromoDuck is drooling over your Pencil.',
            '* PromoDuck uses a toothpick.\n* Oh, wait. \n* He swallows it.',
        ];*/
        this.checkText = '* А вот и ПромоУтка!';
        this.flavourText = [
            '* ПромоУтка чистит пёрышки.\n* Он нашёл залысину.',
            '* 9 из 30000 Тунеров рекомендуют!',
            '* ПромоУтка пускает слюни на Карандаш.',
            '* ПромоУтка использует зубочистку.\n* А, стоп... \n* Он грызёт её...',
        ];

        this.hp = 100;
        this.soul = new Soul(this.bounds.x1, this.bounds.y1);

        this.attacks = [new Attack(30, 200), new AssAttack(), new CockAttack()];
        this.attack = null;

        this.dollar = new DollarRecognizer();
        this.drawing = false;
        this.drawnPoints = [];
        
        this.ownAttackCastTime = 40;
        this.ownAttackCastTimer = 0;
        this.ownAttackPending = false;
        this.pendingAnimationTime = 50;
        this.ownAttackPendingTime = 60;
        this.ownAttackPendingTimer = 0;

        this.ownAttackType = ATTACK_NONE;
        this.ownAttackDamage = 0;
        this.ownAttackStrength = 0;

        let attackSprites = [
            './img/miss.png',
            './img/circle.png',
            './img/triangle.png',
            './img/star.png',
        ];
        this.ownAttackSprites = [];
        for(let i in attackSprites)
        {
            let img = new Image();
            img.src = attackSprites[i];
            this.ownAttackSprites.push(img);
        }

        this.buttons = [
            {name: 'АТАКА', action: this.OwnAttack.bind(this)},
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
        
        if(this.mode == GAME_OVER)
        {
            this.ctx.font = '36px Arial';
            this.ctx.fillStyle = '#000';
    
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(`Всё!`, this.canvas.width / 2, this.canvas.height / 2);

            return;
        }

        let shake = 0;
        
        if(this.ownAttackPending && this.ownAttackPendingTimer < this.pendingAnimationTime)
        {
            let dist = 20 * (this.ownAttackPendingTimer / this.pendingAnimationTime);
            shake = Math.sin(_dt / 20) * dist;
        }

        this.ctx.drawImage(this.enemySprites[this.ownAttackPending ? 1 : 0], this.bounds.x1 + (this.bounds.x2 - this.bounds.x1) / 2 - 300 / 2 + shake, 0, 300, 300);

        this.ctx.strokeStyle = '#000';
        this.ctx.fillStyle = '#fff';
        this.ctx.lineWidth = 5;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        this.ctx.beginPath();
        this.ctx.rect(this.bounds.x1, this.bounds.y1, this.bounds.x2 - this.bounds.x1, this.bounds.y2 - this.bounds.y1);
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.closePath();
        
        this.ctx.font = '36px Arial';
        this.ctx.textBaseline = 'top';
        this.ctx.fillStyle = '#000';

        if(this.mode == IDLE)
        {
            this.ctx.textAlign = 'left';
            Utils.MultiLineText(this.ctx, this.checkText, this.bounds.x1 + 25, this.bounds.y1 + 25);
        }

        this.ctx.textAlign = 'left';
        this.ctx.fillText(`${this.hp}/100`, this.bounds.x1, this.bounds.y2 + 10);

        this.ctx.textBaseline = 'bottom';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`${this.enemyHP}/500`, this.bounds.x2, this.bounds.y1 - 10);

        if(this.ownAttackPending)
        {
            if(this.ownAttackPendingTimer >= this.pendingAnimationTime)
            {
                let x = ((this.bounds.x2 - this.bounds.x1) / 2) * (1 - (this.ownAttackPendingTimer - this.pendingAnimationTime) / (this.ownAttackPendingTime - this.pendingAnimationTime));
                let sprite = this.ownAttackSprites[this.ownAttackType];
                this.ctx.drawImage(sprite, this.bounds.x2 - x + sprite.width / 2, this.bounds.y1 - 150 - sprite.height);
            }
            else
            {
                this.ctx.fillStyle = this.ownAttackStrength > .7 ? '#FF0000' : this.ownAttackStrength > .4 ? '#FF9F00' : '#808080';
                this.ctx.textAlign = 'right';
                this.ctx.textBaseline = 'bottom';

                this.ctx.fillText(`-${this.ownAttackDamage}`, this.bounds.x2, this.bounds.y1 - 40);
            }
        }

        this.ctx.lineWidth = 5;

        if(this.mode == IDLE)
        {
            this.ctx.strokeStyle = '#000';
            this.ctx.fillStyle = '#000';
        }
        else
        {
            this.ctx.strokeStyle = '#aaa';
            this.ctx.fillStyle = '#aaa';
        }

        this.ctx.textBaseline = 'middle';
        this.ctx.textAlign = 'center';
        for(let i in this.buttons)
        {
            this.ctx.strokeRect(this.buttons[i].x, this.bounds.y2 + 70, this.buttons[i].w, 50);
            this.ctx.fillText(this.buttons[i].name, this.buttons[i].x + this.buttons[i].w / 2, this.bounds.y2 + 70 + 25);
        }

        if(this.mode == OWN_ATTACK)
        {
            if(!this.ownAttackPending)
            {
                this.ctx.fillStyle = '#ff0000';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'top';

                if(this.drawing)
                    this.ctx.fillText(`${this.ownAttackCastTimer}`, this.bounds.x1 + (this.bounds.x2 - this.bounds.x1) / 2, this.bounds.y1 + 15);
                else
                    this.ctx.fillText('РИСУЙ!!!', this.bounds.x1 + (this.bounds.x2 - this.bounds.x1) / 2, this.bounds.y1 + 15);
            }

            this.ctx.strokeStyle = '#000';
            this.ctx.beginPath();
            for(let i in this.drawnPoints)
            {
                this.ctx.lineTo(this.drawnPoints[i].x, this.drawnPoints[i].y);
            }
            this.ctx.stroke();
        }

        this.soul.Render(this.ctx);

        for(let i in this.projectiles)
        {
            this.projectiles[i].Render(this.ctx);
        }

        if(this.attack != null)
            this.attack.Render(this.ctx);
    }
    GameLoop()
    {
        if(this.mode == GAME_OVER)
            return;

        if(this.ownAttackPending)
        {
            this.ownAttackPendingTimer--;

            if(this.ownAttackPendingTimer <= 0)
            {
                this.ownAttackPending = false;
                
                if(this.enemyHP > 0)
                    this.Attack();
                else
                {
                    alert('ТЫ ВЫИГРАЛ!');
                    this.GameOver();
                }
            }
        }

        if(this.drawing)
        {
            this.ownAttackCastTimer--;

            if(this.ownAttackCastTimer <= 0)
            {
                this.FinishOwnAttack();
            }
        }

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
                    this.Hurt(projectile.damage);                    
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
        if(this.mode == GAME_OVER)
            return;

        this.mode = ATTACK;
        this.attack = Utils.RandomArray(this.attacks);
        this.attack.Start();
    }
    OwnAttack()
    {
        if(this.mode == GAME_OVER)
            return;

        this.mode = OWN_ATTACK;
    }
    Idle()
    {
        if(this.mode == GAME_OVER)
            return;
        
        this.checkText = Utils.RandomArray(this.flavourText);

        this.mode = IDLE;
        this.attack = null;
        this.projectiles = [];
    }
    GameOver()
    {
        this.mode = GAME_OVER;
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

    PointerDown(e)
    {
        if(!this.ownAttackPending && this.mode == OWN_ATTACK)
        {
            this.ownAttackCastTimer = this.ownAttackCastTime;

            this.drawing = true;
            this.drawnPoints = [];
        }
    }
    PointerUp(e)
    {
        if(!this.ownAttackPending && this.mode == OWN_ATTACK && this.drawing)
        {
            this.FinishOwnAttack();
        }

        this.drawing = false;
        this.drawnPoints = [];
    }
    FinishOwnAttack()
    {
        let res = this.dollar.Recognize(this.drawnPoints, false);
            
        let damage = 0;
        let baseDamage = 0;
        let attack = ATTACK_NONE;
        switch(res.Name)
        {
            case 'triangle':
                baseDamage = 50;
                attack = ATTACK_TRIANGLE;
                break;

            case 'circle':
                baseDamage = 100;
                attack = ATTACK_CIRCLE;
                break;

            case 'star':
                baseDamage = 120;
                attack = ATTACK_STAR;
                break;
        }

        damage = ~~(baseDamage * res.Score);

        this.DealDamage(attack, damage, baseDamage);
        
        this.drawing = false;
        this.drawnPoints = [];
    }

    PointerMove(e)
    {
        let pos = Utils.MousePos(e, this.canvas);

        if(this.mode == ATTACK || this.mode == OWN_ATTACK)
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
            this.canvas.style.cursor = '';

        this.soul.x = pos.x;
        this.soul.y = pos.y;

        if(!this.ownAttackPending && this.mode == OWN_ATTACK && this.drawing)
        {
            if(this.drawnPoints.length == 0 || Utils.Distance(this.drawnPoints[this.drawnPoints.length - 1], pos) >= 15)
                this.drawnPoints.push(pos);
        }
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

    DealDamage(_attack, _damage, _baseDamage)
    {
        this.enemyHP -= _damage;
        if(this.enemyHP < 0)
            this.enemyHP = 0;
        
        this.ownAttackPending = true;
        this.ownAttackType = _attack;
        this.ownAttackDamage = _damage;
        this.ownAttackStrength = _damage / _baseDamage;

        this.ownAttackPendingTimer = this.ownAttackPendingTime;
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

            if(this.invinsibleTimer <= 0)
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
});