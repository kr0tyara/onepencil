
class BattleMode
{
    constructor(_mode)
    {
        this.id = _mode;
        this.locked = false;
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
class TargettedBattleMode extends BattleMode
{
    constructor(_mode)
    {
        super(_mode);
        
        this.iconsSheet = new Image();
        this.iconsSheet.src = './img/icons.png';
        
        this.enemiesPrepared = false;
        this.enemies = [
            {name: 'ПромоУтка', index: {x: 0, y: 0}},
        ];
        this.targetEnemy = null;
        this.targetClickTarget = null;
        this.enemySelection = true;
    }

    Start()
    {
        this.locked = false;
        this.enemySelection = true;

        if(!this.enemiesPrepared)
        {
            let w = 280;
            let h = 100;

            for(let i in this.enemies)
            {
                let enemy = this.enemies[i];
                enemy.x = battle.defaultBounds.x1 + (battle.defaultBounds.x2 - battle.defaultBounds.x1) / 2 - w / 2;
                enemy.y = battle.defaultBounds.y1 + (battle.defaultBounds.y2 - battle.defaultBounds.y1) / 2 + i * h - h / 2;
                enemy.w = w;
                enemy.h = h;
            }

            this.enemiesPrepared = true;
        }
    }
    SelectTarget(_target)
    {
        this.locked = true;
        this.targetEnemy = _target;
        this.enemySelection = false;
    }

    TargetEnemy()
    {
        for(let i in this.enemies)
        {
            if(
                battle.mousePos.x >= this.enemies[i].x && battle.mousePos.x <= this.enemies[i].x + this.enemies[i].w &&
                battle.mousePos.y >= this.enemies[i].y && battle.mousePos.y <= this.enemies[i].y + this.enemies[i].h
            )
                return this.enemies[i];
        }

        return null;
    }
    PointerDown(e)
    {
        this.targetClickTarget = this.TargetEnemy();
        if(this.targetClickTarget == null)
            battle.ui.PointerDown(e);
    }
    PointerUp(e)
    {
        let target = this.TargetEnemy();
        if(target == this.targetClickTarget && target != null)
            this.SelectTarget(target);
        else
            battle.ui.PointerUp(e);

        this.targetClickTarget = null;
    }

    Render(_ctx, _dt)
    {
        _ctx.font = '36px Arial';
        _ctx.textBaseline = 'middle';
        
        _ctx.font = '36px Arial';
        _ctx.fillStyle = '#000';
        _ctx.textAlign = 'center';
        _ctx.textBaseline = 'top';

        _ctx.fillText(this.id == OWN_ATTACK ? 'Атака' : 'Действие', battle.bounds.x1 + (battle.bounds.x2 - battle.bounds.x1) / 2, battle.bounds.y1 + 15);

        _ctx.strokeStyle = '#000';
        _ctx.textAlign = 'left';
        _ctx.textBaseline = 'middle';

        let target = this.TargetEnemy();

        for(let i in this.enemies)
        {
            let enemy = this.enemies[i];

            if(enemy == target)
                _ctx.lineWidth = 5;
            else
                _ctx.lineWidth = 2;

            _ctx.strokeRect(enemy.x, enemy.y, enemy.w, enemy.h);
            _ctx.fillText(enemy.name, enemy.x + 75, enemy.y + enemy.h / 2);
            _ctx.drawImage(this.iconsSheet, 100 * enemy.index.x, 100 * enemy.index.y, 100, 100, enemy.x + 15, enemy.y - 25 + enemy.h / 2, 50, 50);
        }
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
class OwnAttackMode extends TargettedBattleMode
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

        this.attacksSheet = new Image();
        this.attacksSheet.src = './img/own_attacks.png';
        this.ownAttacks = 
        {
            '':         {id: '', damage: 0, index: {x: 0, y: 0}},
            'triangle': {id: 'triangle', damage: 50, index: {x: 1, y: 0}},
            'circle':   {id: 'circle', damage: 100, index: {x: 0, y: 1}},
            'star':     {id: 'star', damage: 120, index: {x: 1, y: 1}},
        };
        this.currentAttack = null;
        this.attackDamage = 0;
    }
    
    Start()
    {
        super.Start();
        this.locked = false;
    }
    SelectTarget(_target)
    {
        super.SelectTarget(_target);
        battle.SetBounds({x1: 500, y1: 300, x2: 780, y2: 550});
    }

    Render(_ctx, _dt)
    {
        // выбор цели
        if(this.enemySelection)
        {
            super.Render(_ctx, _dt);
            return;
        }

        _ctx.font = '36px Arial';
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
                
                _ctx.drawImage(this.attacksSheet, 100 * this.currentAttack.index.x, 100 * this.currentAttack.index.y, 100, 100, battle.defaultBounds.x2 - x + 100 / 2, battle.defaultBounds.y1 - 150 - 100, 100, 100);
            }
            // пуля прилетела
            else
            {
                battle.enemySprite.SetAnimation(STATE_HURT, this.pendingTimer / this.pendingAnimationTime);

                let strength = this.attackDamage / this.currentAttack.damage;
                _ctx.fillStyle = strength > .7 ? '#FF0000' : strength > .4 ? '#FF9F00' : '#808080';
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
                    battle.PreAttack();
                else
                {
                    alert('ТЫ ВЫИГРАЛ!');
                    battle.GameOver();
                }

                this.currentAttack = null;
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
        if(this.enemySelection)
        {
            super.PointerDown(e);
            return;
        }

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
        if(this.enemySelection)
        {
            super.PointerUp(e);
            return;
        }

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
            
        let attack = this.ownAttacks[res.Name];
        if(!attack)
            attack = this.ownAttacks[''];

        let damage = ~~(attack.damage * res.Score);
        battle.DealDamage(damage);
        
        this.pending = true;
        this.currentAttack = attack;
        this.attackDamage = damage;

        this.pendingTimer = this.pendingTime;
        
        this.drawing = false;
        this.drawnPoints = [];
    }
}
class PreAttackMode extends BattleMode
{
    constructor()
    {
        super(PRE_ATTACK);
    }

    Start()
    {
        this.locked = true;
        //battle.enemySprite.SetSpeechBubble(['Люблю какащьке', 'А ведь ам ням\n...\nахался']);
    }
    PointerUp(e)
    {
        battle.enemySprite.typeWriter.PointerUp(e);
    }

    GameLoop()
    {
        // todo: тут мы просираем целый тик, если диалога нет
        if(!battle.enemySprite.speaking)
        {
            battle.Attack();
        }
    }
}
class AttackMode extends BattleMode
{
    constructor()
    {
        super(ATTACK);
    }

    Start()
    {
        this.locked = true;
    }
}
class ActMode extends TargettedBattleMode
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
        ];

        this.selectedAction = null;

        this.typeWriter = new TypeWriter();
    }

    Start()
    {
        super.Start();

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
    SelectTarget(_target)
    {
        super.SelectTarget(_target);
        this.locked = false;
    }

    TargetAction()
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

                battle.PreAttack();
            }
        }
    }

    PointerDown(e)
    {
        if(this.enemySelection)
        {
            super.PointerDown(e);
            return;
        }

        if(this.selectedAction != null)
            return;

        this.clickTarget = this.TargetAction();
        if(this.clickTarget == null)
            battle.ui.PointerDown(e);
    }
    PointerUp(e)
    {
        if(this.enemySelection)
        {
            super.PointerUp(e);
            return;
        }

        if(this.selectedAction != null)
        {
            this.typeWriter.PointerUp(e);
            return;
        }

        let target = this.TargetAction();
        if(target && target == this.clickTarget)
        {
            this.selectedAction = target;
            this.typeWriter.SetText(this.selectedAction.text);
            this.locked = true;
        }
        else
            battle.ui.PointerUp(e);

        this.clickTarget = null;
    }

    Render(_ctx, _dt)
    {
        if(this.enemySelection)
        {
            super.Render(_ctx, _dt);
            return;
        }

        if(this.selectedAction == null)
        {
            _ctx.strokeStyle = '#000';
            _ctx.fillStyle = '#000';
            _ctx.font = '36px Arial';
            _ctx.textBaseline = 'middle';
            _ctx.textAlign = 'left';

            let target = this.TargetAction();

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