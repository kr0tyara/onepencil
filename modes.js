
class BattleMode
{
    constructor(_mode)
    {
        this.id = _mode;
    }

    Start()
    {

    }

    GameLoop()
    {

    }

    Render(_ctx, _dt)
    {

    }

    Click(e)
    {

    }
    PointerDown(e)
    {

    }
    PointerUp(e)
    {

    }
    PointerMove(e)
    {

    }
}

class IdleMode extends BattleMode
{
    constructor()
    {
        super(IDLE);

        this.checkText = '* А вот и ПромоУтка!';
        this.flavourText = [
            '* ПромоУтка чистит пёрышки.\n* Он нашёл залысину.',
            '* 9 из 30000 Тунеров рекомендуют!',
            '* ПромоУтка пускает слюни на Карандаш.',
            '* ПромоУтка использует зубочистку.\n* А, стоп... \n* Он грызёт её...',
        ];
    }

    Start()
    {
        this.checkText = Utils.RandomArray(this.flavourText);
    }

    Render(_ctx, _dt)
    {
        _ctx.font = '36px Arial';
        _ctx.fillStyle = '#000';
        _ctx.textBaseline = 'top';
        _ctx.textAlign = 'left';

        Utils.MultiLineText(_ctx, this.checkText, battle.bounds.x1 + 25, battle.bounds.y1 + 25);
    }

    Click(e)
    {
        battle.ui.Click(e);
    }
}
class OwnAttackMode extends BattleMode
{
    constructor()
    {
        super(OWN_ATTACK);

        this.dollar = new DollarRecognizer();
        this.drawing = false;
        this.drawnPoints = [];
        
        this.castTime = 40;
        this.castTimer = 0;

        this.pendingTime = 60;
        this.pendingTimer = 0;
        this.pendingAnimationTime = 50;
        this.pending = false;

        this.attackType = ATTACK_NONE;
        this.attackDamage = 0;
        this.attackStrength = 0;

        let sprites = [
            './img/miss.png',
            './img/circle.png',
            './img/triangle.png',
            './img/star.png',
        ];
        this.attackSprites = [];
        for(let i in sprites)
        {
            let img = new Image();
            img.src = sprites[i];
            this.attackSprites.push(img);
        }
    }

    Render(_ctx, _dt)
    {
        // рисуем
        if(!this.pending)
        {
            _ctx.fillStyle = '#ff0000';
            _ctx.textAlign = 'center';
            _ctx.textBaseline = 'top';

            if(this.drawing)
                _ctx.fillText(`${this.castTimer}`, battle.bounds.x1 + (battle.bounds.x2 - battle.bounds.x1) / 2, battle.bounds.y1 + 15);
            else
                _ctx.fillText('РИСУЙ!!!', battle.bounds.x1 + (battle.bounds.x2 - battle.bounds.x1) / 2, battle.bounds.y1 + 15);
        }
        // анимация нашей атаки
        else
        {
            // пуля летит
            if(this.pendingTimer >= this.pendingAnimationTime)
            {
                let x = ((battle.bounds.x2 - battle.bounds.x1) / 2) * (1 - (this.pendingTimer - this.pendingAnimationTime) / (this.pendingTime - this.pendingAnimationTime));
                let sprite = this.attackSprites[this.attackType];
                _ctx.drawImage(sprite, battle.bounds.x2 - x + sprite.width / 2, battle.bounds.y1 - 150 - sprite.height);
            }
            // пуля прилетела
            else
            {
                battle.enemySprite.SetAnimation(true, this.pendingTimer / this.pendingAnimationTime);

                _ctx.fillStyle = this.attackStrength > .7 ? '#FF0000' : this.attackStrength > .4 ? '#FF9F00' : '#808080';
                _ctx.textAlign = 'right';
                _ctx.textBaseline = 'bottom';

                _ctx.fillText(`-${this.attackDamage}`, battle.bounds.x2, battle.bounds.y1 - 40);
            }
        }

        _ctx.lineCap = 'round';
        _ctx.lineJoin = 'round';
        _ctx.lineWidth = 5;
        _ctx.strokeStyle = '#000';
        _ctx.beginPath();

        for(let i in this.drawnPoints)
        {
            _ctx.lineTo(this.drawnPoints[i].x, this.drawnPoints[i].y);
        }

        _ctx.stroke();
    }
    GameLoop()
    {
        if(this.pending)
        {
            this.pendingTimer--;

            if(this.pendingTimer <= 0)
            {
                this.pending = false;
                battle.enemySprite.SetAnimation(false, 0);
                
                if(battle.enemyHP > 0)
                    battle.Attack();
                else
                {
                    alert('ТЫ ВЫИГРАЛ!');
                    battle.GameOver();
                }
            }
        }

        if(this.drawing)
        {
            this.castTimer--;

            if(this.castTimer <= 0)
                this.FinishOwnAttack();
        }
    }

    PointerDown(e)
    {
        if(!this.pending)
        {
            this.castTimer = this.castTime;

            this.drawing = true;
            this.drawnPoints = [];
        }
    }
    PointerUp(e)
    {
        if(!this.pending && this.drawing)
            this.FinishOwnAttack();

        this.drawing = false;
        this.drawnPoints = [];
    }
    PointerMove(e)
    {
        let pos = Utils.MousePos(e, battle.canvas);

        if(!this.pending && this.drawing)
        {
            if(this.drawnPoints.length == 0 || Utils.Distance(this.drawnPoints[this.drawnPoints.length - 1], pos) >= 15)
                this.drawnPoints.push(pos);
        }
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
        battle.DealDamage(damage);
        
        this.pending = true;
        this.attackType = attack;
        this.attackDamage = damage;
        this.attackStrength = damage / baseDamage;

        this.pendingTimer = this.pendingTime;
        
        this.drawing = false;
        this.drawnPoints = [];
    }
}
class AttackMode extends BattleMode
{
    constructor()
    {
        super(ATTACK);
    }
}
class GameOverMode extends BattleMode
{
    constructor()
    {
        super(GAME_OVER);
    }
}