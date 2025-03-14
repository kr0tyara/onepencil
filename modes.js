
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
        {
            Utils.RandomArray([res.sfx.click1, res.sfx.click2, res.sfx.click3]).play();
            this.SelectTarget(target);
        }
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
        if(!battle.boundsReady)
            return;
        
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

class DrawingMode extends TargettedBattleMode
{
    constructor(_mode)
    {
        super(_mode);

        this.drawing = false;
        this.drawnPoints = [];
        
        this.castTime = 80;
        this.castTimer = 0;

        this.lineWidth = 5;
        this.color = '#000000';
    }

    GameLoop(_delta)
    {
        if(!this.drawing)
            return;

        this.castTimer -= 1 * _delta;

        if(this.castTimer <= 0)
            this.Finish();
    }
    
    static DrawLine(_ctx, _points, _pos, _lineWidth = 5, _color = '#000')
    {
        _ctx.lineCap = _ctx.lineJoin = 'round';
        _ctx.lineWidth = _lineWidth;
        _ctx.strokeStyle = _color;
        _ctx.beginPath();

        let points = [..._points];
        if(_points.length > 0 && _pos != null)
            points.push(_pos);
        
        for(let i = 1; i < points.length; i++)
        {
            let dx = points[i].x;
            let dy = points[i].y;

            let lx = points[i - 1].x;
            let ly = points[i - 1].y;

            //chrome evil thing
            if(lx == dx && ly == dy)
            {
                lx += .01;
                ly += .01;
            }

            _ctx.quadraticCurveTo(lx, ly, (dx + lx) / 2, (dy + ly) / 2);
        }
        if(_points.length > 0 && _pos != null)
            _ctx.lineTo(_pos.x, _pos.y);

        _ctx.stroke();
        _ctx.closePath();
    }

    Render(_ctx, _dt)
    {
        if(this.enemySelection)
        {
            super.Render(_ctx, _dt);
            return;
        }
        
        _ctx.font = '36px Pangolin';
        _ctx.fillStyle = '#ff0000';
        _ctx.textAlign = 'center';
        _ctx.textBaseline = 'top';

        let text = 'РИСУЙ!!!';
        if(this.drawing)
            text = `${~~this.castTimer}`;
        _ctx.fillText(text, battle.bounds.x1 + (battle.bounds.x2 - battle.bounds.x1) / 2, battle.bounds.y1 + 15 + 4);

        DrawingMode.DrawLine(_ctx, this.drawnPoints, {x: battle.soul.x, y: battle.soul.y}, this.lineWidth, this.color);
    }

    PointerDown(e)
    {
        if(this.enemySelection)
        {
            super.PointerDown(e);
            return;
        }

        this.castTimer = this.castTime;

        this.drawing = true;
        this.drawnPoints = [];

        // фикс рисования с мобилы
        battle.TeleportSoulToCursor(e);

        this.AddPoint();
    }
    PointerUp(e)
    {
        if(this.enemySelection)
        {
            super.PointerUp(e);
            return;
        }

        this.AddPoint();
        if(this.drawing)
            this.Finish();

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

        let pos = {x: ~~battle.soul.x, y: ~~battle.soul.y};
        if(this.drawnPoints.length == 0 || Utils.Distance(this.drawnPoints[this.drawnPoints.length - 1], pos) >= 15)
            this.drawnPoints.push(pos);
    }

    Finish()
    {
        this.drawing = false;
        this.drawnPoints = [];
    }
}

class OwnAttackMode extends DrawingMode
{
    constructor()
    {
        super(OWN_ATTACK);

        this.dollar = new DollarRecognizer();

        this.pendingTime = 130;
        this.transformTime = 50;
        this.flyTime = 20;
        this.damageTime = 20;
        this.shakeTime = 40;
        this.pendingTimer = 0;
        this.pending = false;

        this.currentAttack = null;
        this.attackDamage = 0;

        this.attackType = null;
        this.attackAnimation = null;
        this.soundPlayed = false;
    }
    
    Start()
    {
        super.Start();
        this.locked = false;

        this.attackType = Object.values(battle.ownAttacks)[battle.ownAttackIndex];
        this.attackAnimations = 
        {
            drawing: this.attackType.sheet.GetTagFrames('drawing'),
            attack: this.attackType.sheet.GetTagFrames('transform'),
            loop: this.attackType.sheet.GetTagFrames('loop'),
            failure: this.attackType.sheet.GetTagFrames('failure'),
        }
    }
    SelectTarget(_target)
    {
        super.SelectTarget(_target);
        battle.SetBounds({x1: 515, y1: 300, x2: 765, y2: 550, a: 1});
    }

    Render(_ctx, _dt)
    {
        if(!this.enemySelection && !this.pending)
        {
            let template = this.attackType;
            if(template != null)
            {
                _ctx.globalAlpha = .5;

                this.attackType.sheet.Draw(_ctx, 'attack', Utils.GetAnimationFrame(_dt, 200, this.attackAnimations.drawing), battle.bounds.x1 + (battle.bounds.x2 - battle.bounds.x1) / 2, battle.bounds.y1 + (battle.bounds.y2 - battle.bounds.y1) / 2, -1, -1, true);

                _ctx.globalAlpha = 1;
            }

        }

        // выбор цели и рисовака
        if(!this.pending)
        {
            super.Render(_ctx, _dt);
            return;
        }

        // анимация нашей атаки
        if(this.attackDamage <= 5)
        {
            // превращается в каракулю
            if(this.pendingTimer <= this.transformTime)
            {
                let t = Utils.Clamp(this.pendingTimer / this.transformTime, 0, 1);

                this.attackType.sheet.Draw(_ctx, 'attack', this.attackAnimations.failure[Math.round((this.attackAnimations.failure.length - 1) * t)], battle.bounds.x1 + (battle.bounds.x2 - battle.bounds.x1) / 2, battle.bounds.y1 + (battle.bounds.y2 - battle.bounds.y1) / 2, -1, -1, true);
            }
            else
            {
                let t = Utils.Clamp((this.pendingTimer - this.transformTime) / (this.flyTime + this.damageTime), 0, 1);

                let pos = Utils.CurvePos({x: 0, y: battle.bounds.y1 + (battle.bounds.y2 - battle.bounds.y1) / 2}, {x: 0, y: _ctx.canvas.height + 150}, 300, t);

                _ctx.save();
                _ctx.translate(battle.bounds.x1 + (battle.bounds.x2 - battle.bounds.x1) / 2, pos.y);
                _ctx.rotate(Math.PI * t);
                
                this.attackType.sheet.Draw(_ctx, 'attack', this.attackAnimations.failure[Math.round((this.attackAnimations.failure.length - 1) * 3 * t) % this.attackAnimations.failure.length], 0, 0, -1, -1, true);

                _ctx.restore();
            }
        }
        else
        {
            // пуля транформируется
            if(this.pendingTimer <= this.transformTime)
            {
                let t = Utils.Clamp(this.pendingTimer / this.transformTime, 0, 1);

                this.attackType.sheet.Draw(_ctx, 'attack', this.attackAnimations.attack[Math.round((this.attackAnimations.attack.length - 1) * t)], battle.bounds.x1 + (battle.bounds.x2 - battle.bounds.x1) / 2, battle.bounds.y1 + (battle.bounds.y2 - battle.bounds.y1) / 2, -1, -1, true);
            }
            // пуля летит
            else if(this.pendingTimer - this.transformTime <= this.flyTime)
            {
                let t = Utils.Clamp((this.pendingTimer - this.transformTime) / this.flyTime, 0, 1);

                let y = (this.targetEnemy.data.sprite.y + this.targetEnemy.data.sprite.pivot.y - 50 - (battle.bounds.y1 + (battle.bounds.y2 - battle.defaultBounds.y1) / 2 - 50)) * t;
                
                this.attackType.sheet.Draw(_ctx, 'attack', this.attackAnimations.loop[Math.round((this.attackAnimations.loop.length - 1) * 2 * t) % this.attackAnimations.loop.length], battle.bounds.x1 + (battle.bounds.x2 - battle.bounds.x1) / 2, battle.bounds.y1 + (battle.bounds.y2 - battle.bounds.y1) / 2 + y, -1, -1, true);
                
                //_ctx.drawImage(res.sprites.ownAttacks, 100 * this.currentAttack.index.x, 100 * this.currentAttack.index.y, 100, 100, battle.defaultBounds.x1 + (battle.defaultBounds.x2 - battle.defaultBounds.x1) / 2 - 50, battle.defaultBounds.y1 + (battle.defaultBounds.y2 - battle.defaultBounds.y1) / 2 - 50 + y, 100, 100);
            }
            // пуля прилетела
            else
            {
                // шкала здоровья
                let x = battle.bounds.x1 + (battle.bounds.x2 - battle.bounds.x1) / 2 - 200 / 2;
                let y = battle.bounds.y1 - 50;
        
                _ctx.save();
                _ctx.beginPath();
                Utils.RoundedRect(_ctx, x, y, 200, 32, 6);
                _ctx.clip();
                
                _ctx.fillStyle = '#aaa';
                _ctx.fillRect(x, y, 200, 32);
                _ctx.fillStyle = '#000';

                let t = Utils.Clamp((this.pendingTimer - this.transformTime - this.flyTime) / this.damageTime, 0, 1);
                let hp = this.hpBeforeAttack - (this.hpBeforeAttack - this.targetEnemy.data.hp) * t;

                _ctx.fillRect(x, y, 200 * hp / this.targetEnemy.data.maxHP, 32);
        
                _ctx.restore();
                _ctx.stroke();
                _ctx.closePath();

                // дельта
                let strength = this.attackDamage / this.currentAttack.damage;
                _ctx.fillStyle = strength > .9 ? '#FF0000' : strength > .5 ? '#FF9F00' : '#808080';
                _ctx.textAlign = 'center';
                _ctx.textBaseline = 'bottom';
                _ctx.strokeStyle = '#000';
                _ctx.lineWidth = 5;
                _ctx.font = '50px Pangolin';

                let pos = Utils.CurvePos({x: 0, y: y + 10}, {x: 0, y: y}, 25, t);
                _ctx.strokeText(`${this.attackDamage}`, battle.bounds.x1 + (battle.bounds.x2 - battle.bounds.x1) / 2, pos.y);
                _ctx.fillText(`${this.attackDamage}`, battle.bounds.x1 + (battle.bounds.x2 - battle.bounds.x1) / 2, pos.y);

                t = Utils.Clamp((this.pendingTimer - this.transformTime - this.flyTime) / this.shakeTime, 0, 1);
                this.targetEnemy.data.sprite.SetAnimation(STATE_HURT, 1 - t);
            }
        }
    }
    GameLoop(_delta)
    {
        super.GameLoop(_delta);

        if(this.pending)
        {
            if(this.pendingTimer <= this.pendingTime)
                this.pendingTimer += 1 * _delta;
            else
            {
                this.pending = false;
                this.targetEnemy.data.sprite.SetAnimation(STATE_NORMAL, 0);

                battle.OnOwnAttackEnd();

                this.currentAttack = null;
            }
        }

        // пуля прилетела
        if(this.pending && this.pendingTimer - this.transformTime >= this.flyTime)
        {
            this.HurtAnimationEnd();
        }

        if(this.pending && this.pendingTimer >= this.transformTime && !this.soundPlayed)
        {
            this.soundPlayed = true;
            if(this.currentAttack.sfx != null && this.currentAttack.sfx.length > 1)
                this.currentAttack.sfx[1].play();
            else if(this.attackDamage <= 5)
                res.sfx.scribble2.play();
        }
    }

    PointerDown(e)
    {
        if(!this.pending)
            super.PointerDown(e);
    }
    PointerUp(e)
    {
        if(!this.pending)
            super.PointerUp(e);
    }

    HurtAnimationEnd()
    {
        if(this.hurtAnimationFinished)
            return;
        
        this.hurtAnimationFinished = true;
        if(this.attackDamage > 5)
            res.sfx.hurt.play();

        let result = this.targetEnemy.data.Hurt(this.attackDamage);
        battle.lastActionResult = {
            ...result,
            target: this.targetEnemy.data,
        }
    }

    Finish()
    {
        this.hpBeforeAttack = this.targetEnemy.data.hp;

        let recognize = this.dollar.Recognize(this.drawnPoints, false);
        let attack = battle.ownAttacks[recognize.Name];
        let failure = false;

        if(!attack || recognize.Name != Object.keys(battle.ownAttacks)[battle.ownAttackIndex])
            failure = true;

        if(failure)
            attack = battle.ownAttacks[''];
        
        let damage = 0;
        let bonus = 0;
        if(!failure)
        {
            damage = ~~(attack.damage * recognize.Score);
            bonus = Math.max(~~(attack.damage / 2 * (this.castTimer / this.castTime)), 0);
        }
        
        this.attackDamage = damage + bonus;
        battle.DealDamage(this.targetEnemy, this.attackDamage);
        
        this.pending = true;
        this.currentAttack = attack;

        this.soundPlayed = false;
        if(this.currentAttack.sfx != null && this.currentAttack.sfx.length > 0)
            this.currentAttack.sfx[0].play();
        else if(this.attackDamage <= 5)
            res.sfx.scribble1.play();

        this.pendingTimer = 0;
        this.hurtAnimationFinished = false;

        super.Finish();
    }
}
class PreAttackMode extends BattleMode
{
    constructor()
    {
        super(PRE_ATTACK);

        this.typeWriter = new TypeWriter(null, true);
        this.typeWriterActive = false;
        this.speechActive = false;
    }

    Start()
    {
        this.locked = true;
        this.typeWriterActive = false;
        this.speechActive = false;

        if(battle.lastActionResult.text)
            this.StartTypeWriter();
        else if(battle.lastActionResult.speech)
            this.StartSpeech();
        else
            battle.Attack();
    }

    StartTypeWriter()
    {
        if(!battle.lastActionResult.text)
            return;

        battle.ResetBounds();
        this.typeWriter.Start();
        this.typeWriter.SetText(battle.lastActionResult.text);

        this.typeWriterActive = true;
    }

    StartSpeech()
    {
        if(!battle.lastActionResult.speech)
            return;

        this.speechActive = true;
        battle.enemies[0].sprite.SetSpeechBubble(battle.lastActionResult.speech, battle.lastActionResult.actions ? battle.lastActionResult.actions : []);
    }
    PointerUp(e)
    {
        if(this.typeWriterActive)
            this.typeWriter.PointerUp(e);
        else if(this.speechActive)
            battle.enemies[0].sprite.speechBubble.PointerUp(e);
    }

    GameLoop(_delta)
    {
        if(this.typeWriterActive)
        {
            if(!this.typeWriter.finished)
            {
                if(battle.boundsReady)
                    this.typeWriter.GameLoop(_delta);
            }
            else if(!this.speechActive)
            {
                this.typeWriterActive = false;
                this.StartSpeech();
            }
            return;
        }

        if(this.speechActive && !battle.enemies[0].sprite.speaking)
            this.speechActive = false;
        
        if(!this.typeWriterActive && !this.speechActive)
        {
            if(battle.lastActionResult.mode != null)
                battle.SetMode(battle.lastActionResult.mode);
            else
                battle.Attack();
        }
    }

    Render(_ctx, _dt)
    {
        if(!battle.boundsReady)
            return;

        if(this.typeWriterActive)
            this.typeWriter.Render(_ctx, _dt);
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
        let h = 80; //Math.min(80, (battle.defaultBounds.y2 - battle.defaultBounds.y1) / Math.ceil(this.actions.length / 2) - 25 * 3 / 4);

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
            Utils.RandomArray([res.sfx.click1, res.sfx.click2, res.sfx.click3]).play();

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
            delete battle.lastActionResult.text;

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

class DrawMode extends DrawingMode
{
    constructor()
    {
        super(DRAW);

        this.lineWidth = 5;
        this.color = '#ff0000';
    }

    Start()
    {
        this.SelectTarget(battle.lastActionResult.target);
        this.targetEnemy.sprite.positionLocked = true;

        this.lineWidth = Utils.RandomRound(2, 20);
        let hue = Utils.RandomRound(0, 36) * 10;
        this.color = `hsl(${hue}, 100%, 50%)`;

        battle.SetBounds({x1: battle.defaultBounds.x1 - 25, y1: 15, x2: battle.defaultBounds.x1 + 295, y2: 305, a: 0}, true);
    }

    PointerDown(e)
    {
        this.targetEnemy.sprite.SetExpression(8);
        super.PointerDown(e);
    }

    Finish()
    {
        let res = battle.lastActionResult;
        delete res.mode;

        // это очень говёно. хорошо что никто не смотрит!
        let draw = [];
        for(let i in this.drawnPoints)
        {
            draw.push({x: this.drawnPoints[i].x - (battle.defaultBounds.x1 - 55), y: this.drawnPoints[i].y});
        }
        DrawingMode.DrawLine(this.targetEnemy.sprite.vandalismCtx, draw, null, this.lineWidth, this.color);
        
        battle.lastActionResult = {...this.targetEnemy.Drawn(this.drawnPoints.length), target: this.targetEnemy};
        battle.SetMode(PRE_ATTACK);

        super.Finish();
    }
}

class ItemsMode extends BattleMode
{
    constructor()
    {
        super(ITEMS);
        this.locked = false;
    }

    PointerDown(e)
    {
        battle.ui.PointerDown(e);
    }
    PointerUp(e)
    {
        battle.ui.PointerUp(e);
    }
    Back()
    {
        battle.Idle();
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