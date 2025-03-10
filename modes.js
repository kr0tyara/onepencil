
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

    GameLoop(_delta)
    {

    }

    Render(_ctx, _dt)
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
        
        this.enemies = [];
        this.targetEnemy = null;
        this.targetClickTarget = null;
        this.enemySelection = true;
    }

    Start()
    {
        this.locked = false;
        this.enemySelection = true;

        this.enemies = [];
        for(let i in battle.enemies)
        {
            let enemyData = battle.enemies[i];

            if(!enemyData.alive)
                continue;

            let enemy = {data: enemyData};
            this.enemies.push(enemy);
        }

        let w = 280;
        let h = Math.min(100, (battle.defaultBounds.y2 - battle.defaultBounds.y1 - 100 - 25 * (this.enemies.length - 1)) / this.enemies.length);

        for(let i in this.enemies)
        {
            let enemy = this.enemies[i];
            enemy.x = battle.defaultBounds.x1 + (battle.defaultBounds.x2 - battle.defaultBounds.x1) / 2 - w / 2;
            enemy.y = battle.defaultBounds.y1 + (battle.defaultBounds.y2 - battle.defaultBounds.y1) / 2 + i * (h + 25) - h / 2 + 10;
            enemy.w = w;
            enemy.h = h;
        }
    }
    SelectTarget(_target)
    {
        this.locked = true;
        this.targetEnemy = _target;
        this.enemySelection = false;
    }
    Back()
    {
        battle.Idle();
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
        _ctx.font = '36px Pangolin';
        _ctx.textAlign = 'center';
        _ctx.textBaseline = 'top';

        _ctx.fillStyle = '#666';
        _ctx.fillText('Цель', battle.bounds.x1 + (battle.bounds.x2 - battle.bounds.x1) / 2, battle.bounds.y1 + 15 + 4);

        _ctx.strokeStyle = '#000';
        _ctx.textAlign = 'left';
        _ctx.textBaseline = 'middle';
        _ctx.lineWidth = 3;

        let target = this.TargetEnemy();

        for(let i in this.enemies)
        {
            let enemy = this.enemies[i];

            if(enemy == target)
                _ctx.strokeStyle = _ctx.fillStyle = '#0d85f3';
            else
                _ctx.strokeStyle = _ctx.fillStyle = '#000';

            _ctx.save();
            _ctx.beginPath();
            Utils.RoundedRect(_ctx, enemy.x, enemy.y, enemy.w, enemy.h, 4);
            _ctx.clip();

            _ctx.fillText(enemy.data.name, enemy.x + 75 + 5, enemy.y + enemy.h / 2);

            Utils.MaskSprite(_ctx, battle.tempCtx, res.sprites.icons, 100 * enemy.data.index.x, 100 * enemy.data.index.y, 100, 100, enemy.x + 15, enemy.y - 25 + enemy.h / 2, 50, 50, _ctx.fillStyle);

            _ctx.fillStyle = enemy == target ? '#B3C9DB' : '#aaa';
            _ctx.fillRect(enemy.x, enemy.y + enemy.h - 15, enemy.w, 15);

            _ctx.fillStyle = enemy == target ? '#0d85f3' : '#000';
            _ctx.fillRect(enemy.x, enemy.y + enemy.h - 15, enemy.w * enemy.data.hp / enemy.data.maxHP, 15);

            _ctx.stroke();
            _ctx.closePath();
            _ctx.restore();
        }
    }
}

class IdleMode extends BattleMode
{
    constructor()
    {
        super(IDLE);
        this.typeWriter = new TypeWriter(null, false);
    }

    Start()
    {
        let result = battle.enemies[0].Idle();

        this.typeWriter.Start();
        this.typeWriter.SetText(result.text);
    }

    GameLoop(_delta)
    {
        this.typeWriter.GameLoop(_delta);
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
            battle.mousePos.y < battle.defaultBounds.y2 + 70 || battle.mousePos.y > battle.defaultBounds.y2 + 70 + 70
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
        
        this.castTime = 80;
        this.castTimer = 0;

        this.pendingTime = 60;
        this.pendingTimer = 0;
        this.pendingAnimationTime = 50;
        this.pending = false;

        this.impactTime = 10;
        this.impactTimer = 0;

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

        _ctx.font = '36px Pangolin';
        // рисуем
        if(!this.pending)
        {
            _ctx.fillStyle = '#ff0000';
            _ctx.textAlign = 'center';
            _ctx.textBaseline = 'top';

            if(this.drawing)
                _ctx.fillText(`${~~this.castTimer}`, battle.bounds.x1 + (battle.bounds.x2 - battle.bounds.x1) / 2, battle.bounds.y1 + 15);
            else
                _ctx.fillText('РИСУЙ!!!', battle.bounds.x1 + (battle.bounds.x2 - battle.bounds.x1) / 2, battle.bounds.y1 + 15 + 4);
            
            _ctx.lineCap = 'round';
            _ctx.lineJoin = 'round';
            _ctx.lineWidth = 5;

            let template = Object.values(battle.ownAttacks)[battle.ownAttackIndex];
            if(template != null)
            {
                _ctx.globalAlpha = .5;

                _ctx.drawImage(res.sprites.ownAttacks, 100 * template.index.x, 100 * template.index.y, 100, 100, battle.defaultBounds.x1 + (battle.defaultBounds.x2 - battle.defaultBounds.x1) / 2 - 50, battle.defaultBounds.y1 + (battle.defaultBounds.y2 - battle.defaultBounds.y1) / 2 - 50, 100, 100);

                _ctx.globalAlpha = 1;
            }

            _ctx.strokeStyle = '#000';
            _ctx.beginPath();

            for(let i in this.drawnPoints)
            {
                _ctx.lineTo(this.drawnPoints[i].x, this.drawnPoints[i].y);
            }
            if(this.drawnPoints.length > 0)
                _ctx.lineTo(battle.soul.x, battle.soul.y);

            _ctx.stroke();
            _ctx.closePath();
        }
        // анимация нашей атаки
        else
        {
            // пуля летит
            if(this.pendingTimer >= this.pendingAnimationTime)
            {
                let t = Utils.Clamp(1 - (this.pendingTimer - this.pendingAnimationTime) / (this.pendingTime - this.pendingAnimationTime), 0, 1);
                let y = (this.targetEnemy.data.sprite.y + this.targetEnemy.data.sprite.pivot.y  - (battle.defaultBounds.y1 + (battle.defaultBounds.y2 - battle.defaultBounds.y1) / 2 - 50)) * t;
                
                _ctx.drawImage(res.sprites.ownAttacks, 100 * this.currentAttack.index.x, 100 * this.currentAttack.index.y, 100, 100, battle.defaultBounds.x1 + (battle.defaultBounds.x2 - battle.defaultBounds.x1) / 2 - 50, battle.defaultBounds.y1 + (battle.defaultBounds.y2 - battle.defaultBounds.y1) / 2 - 50 + y, 100, 100);
            }
            // пуля прилетела
            else
            {
                // шкала здоровья
                let x = battle.defaultBounds.x1 + (battle.defaultBounds.x2 - battle.defaultBounds.x1) / 2 - 200 / 2;
                let y = battle.defaultBounds.y1 - 100;
        
                _ctx.save();
                _ctx.beginPath();
                Utils.RoundedRect(_ctx, x, y, 200, 32, 6);
                _ctx.clip();
                
                _ctx.fillStyle = '#aaa';
                _ctx.fillRect(x, y, 200, 32);
                _ctx.fillStyle = '#000';

                let t = Utils.Clamp((this.pendingTimer - (this.pendingAnimationTime - 15)) / 15, 0, 1);
                let hp = this.targetEnemy.data.hp - (this.targetEnemy.data.hp - this.hpBeforeAttack) * t;

                _ctx.fillRect(x, y, 200 * hp / this.targetEnemy.data.maxHP, 32);
        
                _ctx.restore();
                _ctx.stroke();
                _ctx.closePath();

                // дельта
                let strength = this.attackDamage / this.currentAttack.damage;
                _ctx.fillStyle = strength > .8 ? '#FF0000' : strength > .6 ? '#FF9F00' : '#808080';
                _ctx.textAlign = 'center';
                _ctx.textBaseline = 'bottom';
                _ctx.strokeStyle = '#000';
                _ctx.lineWidth = 5;
                _ctx.font = '50px Pangolin';

                let pos = Utils.CurvePos({x: 0, y: y + 10}, {x: 0, y: y}, 25, 1 - t);
                _ctx.strokeText(`${this.attackDamage}`, battle.defaultBounds.x1 + (battle.defaultBounds.x2 - battle.defaultBounds.x1) / 2, pos.y);
                _ctx.fillText(`${this.attackDamage}`, battle.defaultBounds.x1 + (battle.defaultBounds.x2 - battle.defaultBounds.x1) / 2, pos.y);

                this.targetEnemy.data.sprite.SetAnimation(STATE_HURT, this.pendingTimer / this.pendingAnimationTime);
            }
        }
    }
    GameLoop(_delta)
    {
        if(this.pending)
        {
            if(this.pendingTimer > 0)
                this.pendingTimer -= 1 * _delta;
            else if(this.impactTimer > 0)
                this.impactTimer -= 1 * _delta;
            else
            {
                this.pending = false;
                this.targetEnemy.data.sprite.SetAnimation(STATE_NORMAL, 0);

                battle.OnOwnAttackEnd();

                this.currentAttack = null;
            }
        }

        if(this.drawing)
        {
            this.castTimer -= 1 * _delta;

            if(this.castTimer <= 0)
                this.FinishOwnAttack();
        }

        // пуля прилетела
        if(this.pending && this.pendingTimer < this.pendingAnimationTime)
        {
            this.HurtAnimationEnd();
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

    HurtAnimationEnd()
    {
        if(this.hurtAnimationFinished)
            return;
        
        this.hurtAnimationFinished = true;
        res.sfx.hurt.play();

        let result = this.targetEnemy.data.Hurt(this.attackDamage);
        battle.lastActionResult = {
            ...result,
            target: this.targetEnemy.data,
        }
    }

    FinishOwnAttack()
    {
        let res = this.dollar.Recognize(this.drawnPoints, false);
            
        let attack = battle.ownAttacks[res.Name];
        if(!attack)
            attack = battle.ownAttacks[''];

        if(res.Name != Object.keys(battle.ownAttacks)[battle.ownAttackIndex])
            attack = battle.ownAttacks[''];

        this.hpBeforeAttack = this.targetEnemy.data.hp;
        
        let damage = ~~(attack.damage * res.Score);
        battle.DealDamage(this.targetEnemy, damage);
        
        this.pending = true;
        this.currentAttack = attack;
        
        this.attackDamage = damage;

        this.pendingTimer = this.pendingTime;
        this.impactTimer = this.impactTime;
        this.hurtAnimationFinished = false;

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

        if(battle.lastActionResult.speech)
        {
            battle.enemies[0].sprite.SetSpeechBubble(battle.lastActionResult.speech, battle.lastActionResult.actions ? battle.lastActionResult.actions : []);
        }
    }
    PointerUp(e)
    {
        battle.enemies[0].sprite.speechBubble.PointerUp(e);
    }

    GameLoop(_delta)
    {
        if(!battle.enemies[0].sprite.speaking)
        {
            battle.Attack();
        }
    }
}
class PostAttackMode extends BattleMode
{
    constructor()
    {
        super(POST_ATTACK);
    }

    Start()
    {
        this.locked = true;

        if(battle.lastActionResult.speech)
        {
            battle.enemies[0].sprite.SetSpeechBubble(battle.lastActionResult.speech, battle.lastActionResult.actions ? battle.lastActionResult.actions : []);
        }
    }
    PointerUp(e)
    {
        battle.enemies[0].sprite.speechBubble.PointerUp(e);
    }

    GameLoop(_delta)
    {
        if(!battle.enemies[0].sprite.speaking)
        {
            battle.Idle();
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

        this.clickTarget = null;
        this.actions = [];

        this.selectedAction = null;

        this.typeWriter = new TypeWriter(null, true);
    }

    Start()
    {
        super.Start();

        this.typeWriter.Start();
        this.selectedAction = null;
    }
    SelectTarget(_target)
    {
        super.SelectTarget(_target);
        this.locked = false;
        
        this.actions = [];
        
        for(let i in this.targetEnemy.data.actions)
        {
            let actionData = this.targetEnemy.data.actions[i];
            let action = {...actionData};
            this.actions.push(action);
        }

        let w = (battle.defaultBounds.x2 - battle.defaultBounds.x1) / 2 - 25 * 3 / 4;
        let h = Math.min(80, (battle.defaultBounds.y2 - battle.defaultBounds.y1) / Math.ceil(this.actions.length / 2) - 25 * 3 / 4);

        for(let i in this.actions)
        {
            let action = this.actions[i];

            let x = i % 2;
            let y = ~~(i / 2);
            action.index = {x, y};

            action.x = battle.defaultBounds.x1 + x * w + (x + 1) * 12.5;
            action.y = battle.defaultBounds.y1 + y * h + (y + 1) * 12.5;
            action.w = w;
            action.h = h;
        }
    }
    Back()
    {
        if(this.enemySelection)
            super.Back();
        else
        {
            this.enemySelection = true;
            this.targetEnemy = null;
        }
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

    GameLoop(_delta)
    {
        if(this.selectedAction != null)
        {
            this.typeWriter.GameLoop(_delta);

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
            let result = this.selectedAction.action();
            if(!result || !result.text)
            {
                console.error('всё поехало в жопу!!!', this.selectedAction);
            }

            this.typeWriter.SetText(result.text);
            battle.lastActionResult = {
                ...result,
                target: this.targetEnemy.data,
            }

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
            
            _ctx.font = '36px Pangolin';
            _ctx.textBaseline = 'middle';
            _ctx.textAlign = 'left';
            _ctx.lineWidth = 2;

            let target = this.TargetAction();

            for(let i in this.actions)
            {
                let action = this.actions[i];

                if(action == target)
                    _ctx.strokeStyle = _ctx.fillStyle = '#0d85f3';
                else
                    _ctx.strokeStyle = _ctx.fillStyle = '#000';

                _ctx.beginPath();
                Utils.RoundedRect(_ctx, action.x, action.y, action.w, action.h, 4);
                _ctx.stroke();
                _ctx.closePath();

                Utils.MaskSprite(_ctx, battle.tempCtx, res.sprites.actions, 100 * action.index.x, 100 * action.index.y, 100, 100, action.x + 15, action.y - 75 / 2 + action.h / 2, 75, 75, _ctx.fillStyle);

                _ctx.fillText(action.name, action.x + 75 + 35, action.y + action.h / 2);
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
    
        this.silentTime = 30;
        this.shakeTime = 60;
        this.showTextTime = 120;
        this.showMockeryTime = 200;
        this.showRetryTime = 300;

        this.breakSpeed = 30;
        this.breakDelay = 2;

        this.showTextSpeed = 100;
        this.showRetrySpeed = 50;

        this.soundPlayed = false;
        this.animationTimer = 0;

        this.typeWriter = new TypeWriter(null, false, res.sfx.duck);
        this.flavorText = [
            'Возвращайся, когда станешь... м-м-м... побогаче.',
            'Однажды даже ты сможешь что-то позволить!~          Начни с чего-то малого. %С картошки.'
        ];
    }

    Start()
    {
        res.sfx.bgm.pause();

        this.soulPos = {x: battle.soul.x, y: battle.soul.y};

        this.retryButton = {
            x: battle.canvas.width / 2 - 300 / 2,
            y: battle.canvas.height - 100 - 50,
            w: 300,
            h: 70
        };

        this.soundPlayed = false;
        this.animationTimer = 0;

        this.typeWriter.Start();

        battle.ctx.font = `${this.typeWriter.textSize}px Pangolin`;

        let text = Utils.RandomArray(this.flavorText);
        let w = battle.ctx.measureText(text.split('~')[0]).width;
        
        this.typeWriter.textBounds.y1 = 380;
        this.typeWriter.textBounds.x1 = (battle.canvas.width - w) / 2;
        this.typeWriter.textBounds.x2 = battle.canvas.width;

        this.typeWriter.SetText([`@3${text}@`]);
    }

    GameLoop(_delta)
    {
        if(this.animationTimer > this.showMockeryTime)
            this.typeWriter.GameLoop(_delta);

        this.animationTimer += 1 * _delta;

        if(this.animationTimer >= this.shakeTime && !this.soundPlayed)
        {
            this.soundPlayed = true;
            res.sfx.death.play();
            
            res.sfx.fail.play();
        }
    }
    
    IsHovering()
    {
        if(this.animationTimer < this.showRetryTime)
            return false;

        if(
            battle.mousePos.x >= this.retryButton.x && battle.mousePos.x <= this.retryButton.x + this.retryButton.w &&
            battle.mousePos.y >= this.retryButton.y && battle.mousePos.y <= this.retryButton.y + this.retryButton.h
        )
            return true;

        return false;
    }
    PointerUp(e)
    {
        if(!this.typeWriter.finished)
            this.typeWriter.PointerUp(e);

        if(this.animationTimer < this.showRetryTime)
        {
            this.animationTimer = this.showRetryTime + this.showRetrySpeed;
            return;
        }

        if(this.IsHovering())
            Restart();
    }
    UpdateCursor()
    {
        if(this.IsHovering())
        {
            if(battle.canvas.style.cursor != 'pointer')
                battle.canvas.style.cursor = 'pointer';
        }
        else if(battle.canvas.style.cursor != '')
            battle.canvas.style.cursor = '';
    }

    Render(_ctx, _dt)
    {
        _ctx.fillStyle = '#000';
        _ctx.fillRect(0, 0, _ctx.canvas.width, _ctx.canvas.height);

        this.typeWriter.Render(_ctx, _dt);

        if(this.animationTimer > this.showTextTime)
        {
            let t = (this.animationTimer - this.showTextTime) / this.showTextSpeed;

            _ctx.globalAlpha = t;

            _ctx.font = '108px Pangolin';
            _ctx.fillStyle = '#aaa';
            _ctx.textBaseline = 'top';
            _ctx.textAlign = 'center';
            _ctx.fillText('Игра окончена', _ctx.canvas.width / 2, 200);

            _ctx.globalAlpha = 1;
        }
        if(this.animationTimer > this.showRetryTime)
        {
            let t = (this.animationTimer - this.showRetryTime) / this.showRetrySpeed;

            _ctx.globalAlpha = t;

            _ctx.lineWidth = 3;

            if(this.IsHovering())
                _ctx.fillStyle = _ctx.strokeStyle = '#0d85f3';
            else
                _ctx.fillStyle = _ctx.strokeStyle = '#fff';

            _ctx.beginPath();
            Utils.RoundedRect(_ctx, this.retryButton.x, this.retryButton.y, this.retryButton.w, this.retryButton.h, 6);
            _ctx.stroke();
            _ctx.closePath();

            Utils.MaskSprite(_ctx, battle.tempCtx, res.sprites.buttons, 0, 2 * 50, 50, 50, this.retryButton.x + 10, this.retryButton.y + this.retryButton.h / 2 - 25, 50, 50, _ctx.fillStyle);

            _ctx.font = '32px Pangolin';
            _ctx.textBaseline = 'middle';
            _ctx.textAlign = 'center';
            _ctx.fillText('Заново', this.retryButton.x + 35 / 2 + this.retryButton.w / 2, this.retryButton.y + this.retryButton.h / 2 + 3);

            _ctx.globalAlpha = 1;
        }

        let offset = {x: 0, y: 0};

        if(this.animationTimer >= this.silentTime)
        {
            offset.x = (Math.random() - .5) * 5;
            offset.y = (Math.random() - .5) * 5;
        }

        if(this.animationTimer < this.shakeTime)
            _ctx.drawImage(res.sprites.soul, this.soulPos.x + offset.x, this.soulPos.y + offset.y);
        else 
        {
            let t = (this.animationTimer - this.shakeTime) / this.breakSpeed;

            if(this.animationTimer - this.shakeTime >= this.breakDelay)
            {
                let t = (this.animationTimer - this.shakeTime - this.breakDelay) / this.breakSpeed;

                let pos1 = Utils.CurvePos({x: this.soulPos.x + 16, y: this.soulPos.y + 14 - 10}, {x: this.soulPos.x - 64, y: _ctx.canvas.height}, 150, t);
                _ctx.save();
                _ctx.translate(pos1.x, pos1.y);
                _ctx.rotate(Math.PI * t * 2.5);
                _ctx.drawImage(res.sprites.soulbreak, 0, 0, 32, 28, -16, -14, 32, 28);
                _ctx.restore();
                
                let pos2 = Utils.CurvePos({x: this.soulPos.x + 16, y: this.soulPos.y + 10 + 20}, {x: this.soulPos.x + 100, y: _ctx.canvas.height}, 120, t);
                _ctx.save();
                _ctx.translate(pos2.x, pos2.y);
                _ctx.rotate(-Math.PI * t * 3);
                _ctx.drawImage(res.sprites.soulbreak, 0, 29, 32, 20, -16, -10, 32, 20);
                _ctx.restore();
            }
            else
            {
                _ctx.drawImage(res.sprites.soulbreak, 0, 0, 32, 28, this.soulPos.x, this.soulPos.y - 10, 32, 28);
                _ctx.drawImage(res.sprites.soulbreak, 0, 29, 32, 20, this.soulPos.x, this.soulPos.y + 20, 32, 20);
            }

            let pos1 = Utils.CurvePos({x: this.soulPos.x + 30, y: this.soulPos.y}, {x: this.soulPos.x + 130, y: _ctx.canvas.height}, 200, t);
            _ctx.save();
            _ctx.translate(pos1.x, pos1.y);
            _ctx.rotate(Math.PI * t * 2);
            _ctx.drawImage(res.sprites.soulbreak, 0, 50, 9, 12, -4.5, -6, 9, 12);
            _ctx.restore();

            let pos2 = Utils.CurvePos({x: this.soulPos.x + 20, y: this.soulPos.y}, {x: this.soulPos.x - 130, y: _ctx.canvas.height}, 300, t);
            _ctx.save();
            _ctx.translate(pos2.x, pos2.y);
            _ctx.rotate(-Math.PI * t * 1.5);
            _ctx.drawImage(res.sprites.soulbreak, 10, 51, 12, 13, -6, -7.5, 12, 13);
            _ctx.restore();

            let pos3 = Utils.CurvePos({x: this.soulPos.x + 20, y: this.soulPos.y}, {x: this.soulPos.x + 20, y: _ctx.canvas.height}, 150, t);
            _ctx.save();
            _ctx.translate(pos3.x, pos3.y);
            _ctx.rotate(Math.PI * t);
            _ctx.drawImage(res.sprites.soulbreak, 22, 54, 8, 8, -4, -4, 8, 8);
            _ctx.restore();
        }
    }
}