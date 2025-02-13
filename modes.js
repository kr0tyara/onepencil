
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
            '* ПромоУтка чистит пёрышки.\n* Залысину видно за километр.',
            '* 9 из 36 538 Тунеров рекомендуют!',
            '* Пахнет грифелем.',
            '* ПромоУтка считает свою прибыль.\n* Для этого не нужен калькулятор.',
            '* ПромоУтка ковыряется в зубах.\n* Но, скорее, просто грызёт зубочистку...',
        ];

        this.typeWriter = new TypeWriter(false);
    }

    Start()
    {
        this.checkText  = Utils.RandomArray(this.flavourText);
        this.typeWriter.SetText([this.checkText]);
    }

    GameLoop()
    {
        this.typeWriter.GameLoop();
    }

    Render(_ctx, _dt)
    {
        if(!battle.boundsReady)
            return;

        this.typeWriter.Render(_ctx, _dt);
    }

    PointerDown(e)
    {
        // todo: это не очень красиво!!
        if(
            battle.mousePos.y < battle.defaultBounds.y2 + 70 || battle.mousePos.y > battle.defaultBounds.y2 + 70 + 50
            || battle.mousePos.x < battle.defaultBounds.x1 || battle.mousePos.x > battle.defaultBounds.x2
        )
        {
            this.typeWriter.PointerUp(e);
            return;
        }

        battle.ui.PointerDown(e);
    }
    PointerUp(e)
    {
        battle.ui.PointerUp(e);
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
    
    Start()
    {
        battle.SetBounds({x1: 500, y1: 250, x2: 780, y2: 500});
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
                let x = ((battle.defaultBounds.x2 - battle.defaultBounds.x1) / 2) * (1 - (this.pendingTimer - this.pendingAnimationTime) / (this.pendingTime - this.pendingAnimationTime));
                let sprite = this.attackSprites[this.attackType];
                _ctx.drawImage(sprite, battle.defaultBounds.x2 - x + sprite.width / 2, battle.defaultBounds.y1 - 150 - sprite.height);
            }
            // пуля прилетела
            else
            {
                battle.enemySprite.SetAnimation(STATE_HURT, this.pendingTimer / this.pendingAnimationTime);

                _ctx.fillStyle = this.attackStrength > .7 ? '#FF0000' : this.attackStrength > .4 ? '#FF9F00' : '#808080';
                _ctx.textAlign = 'right';
                _ctx.textBaseline = 'bottom';

                _ctx.fillText(`-${this.attackDamage}`, battle.defaultBounds.x2, battle.defaultBounds.y1 - 40);
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
                battle.enemySprite.SetAnimation(STATE_NORMAL, 0);
                
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

            // фикс рисования с мобилы
            battle.TeleportSoulToCursor(e);

            this.AddPoint();
        }
    }
    PointerUp(e)
    {
        this.AddPoint();
        if(!this.pending && this.drawing)
            this.FinishOwnAttack();

        this.drawing = false;
        this.drawnPoints = [];
    }
    PointerMove(e)
    {
        this.AddPoint();
    }
    AddPoint()
    {
        if(this.pending || !this.drawing)
            return;

        let pos = {x: battle.soul.x, y: battle.soul.y};
        if(this.drawnPoints.length == 0 || Utils.Distance(this.drawnPoints[this.drawnPoints.length - 1], pos) >= 15)
            this.drawnPoints.push(pos);
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
class ActMode extends BattleMode
{
    constructor()
    {
        super(ACT);

        this.spriteSheet = new Image();
        this.spriteSheet.src = './img/actions.png';

        this.clickTarget = null;
        this.actionsPrepared = false;
        this.actions = [
            {name: 'Проверка', text: ['* ПромоУтка - ЗЩТ 10 АТК 10\n* Рекламный бизнесмен.', '* Хочу какать', '* Жёлтый лист осений)']},
            {name: 'Сделка', text: ['* Ты предлагаешь ПромоУтке сделку.\n* Он слишком занят карандашом.']},
            {name: 'Помощь', text: ['* Ты зовёшь Туни.\n* Но никто не пришёл.']},
            {name: 'Флирт', text: ['* Эй красавчик!']},
            {name: 'Пися', text: ['* Эй красавчик!']},
        ];

        this.selectedAction = null;

        this.typeWriter = new TypeWriter();
    }

    Start()
    {
        this.selectedAction = null;

        if(!this.actionsPrepared)
        {
            let w = (battle.defaultBounds.x2 - battle.defaultBounds.x1) / 2;
            let h = (battle.defaultBounds.y2 - battle.defaultBounds.y1) / Math.ceil(this.actions.length / 2);

            for(let i in this.actions)
            {
                let action = this.actions[i];

                let x = i % 2;
                let y = ~~(i / 2);
                action.index = {x, y};

                action.x = battle.defaultBounds.x1 + x * w;
                action.y = battle.defaultBounds.y1 + y * h;
                action.w = w;
                action.h = h;
            }

            this.actionsPrepared = true;
        }
    }

    TargetButton()
    {
        if(
            battle.mousePos.x < battle.defaultBounds.x1 || battle.mousePos.x > battle.defaultBounds.x2 ||
            battle.mousePos.y < battle.defaultBounds.y1 || battle.mousePos.y > battle.defaultBounds.y2
        )
            return null;
        
        for(let i in this.actions)
        {
            if(
                battle.mousePos.x >= this.actions[i].x && battle.mousePos.x <= this.actions[i].x + this.actions[i].w &&
                battle.mousePos.y >= this.actions[i].y && battle.mousePos.y <= this.actions[i].y + this.actions[i].h
            )
                return this.actions[i];
        }

        return null;
    }

    GameLoop()
    {
        if(this.selectedAction != null)
        {
            this.typeWriter.GameLoop();

            if(this.typeWriter.finished)
            {
                this.selectedAction = null;

                battle.Attack();
            }
        }
    }

    PointerDown(e)
    {
        if(this.selectedAction != null)
            return;

        this.clickTarget = this.TargetButton();
    }
    PointerUp(e)
    {
        if(this.selectedAction != null)
        {
            this.typeWriter.PointerUp(e);
            return;
        }

        let target = this.TargetButton();

        if(target && target == this.clickTarget)
        {
            this.selectedAction = target;
            this.typeWriter.SetText(this.selectedAction.text);
        }

        this.clickTarget = null;
    }

    Render(_ctx, _dt)
    {
        if(this.selectedAction == null)
        {
            _ctx.strokeStyle = '#000';
            _ctx.fillStyle = '#000';
            _ctx.font = '36px Arial';
            _ctx.textBaseline = 'middle';
            _ctx.textAlign = 'left';

            let target = this.TargetButton();

            for(let i in this.actions)
            {
                let action = this.actions[i];

                if(action == target)
                    _ctx.lineWidth = 5;
                else
                    _ctx.lineWidth = 2;

                _ctx.strokeRect(action.x, action.y, action.w, action.h);
                _ctx.drawImage(this.spriteSheet, 100 * action.index.x, 100 * action.index.y, 100, 100, action.x + 15, action.y - 50 + action.h / 2, 100, 100);
                _ctx.fillText(action.name, action.x + 150, action.y + action.h / 2);
            }
        }
        else
        {
            this.typeWriter.Render(_ctx, _dt);
        }
    }
}
class GameOverMode extends BattleMode
{
    constructor()
    {
        super(GAME_OVER);
    }
}