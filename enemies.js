class EnemyData
{
    constructor()
    {
        this.name = 'Никто';
        this.index = {x: 0, y: 0};
        this.hp = 0;
        this.maxHP = 0;

        this.actions = [
            {name: 'Проверка', index: {x: 0, y: 0}, action: this.Check.bind(this)},
        ];
    }

    Start()
    {
        this.hp = this.maxHP;
    }

    Idle()
    {
        return {
            text: ['* Где я?']
        }
    }

    Attack()
    {
        return {};
    }

    Check()
    {
        return {
            text: ['* Никто - АТК 1000 ЗЩТ -999.\n* Я ем любовь.']
        };
    }
}
class TriggerAction
{
    constructor()
    {
        this.finished = false;
    }

    Start()
    {

    }
    Render(_ctx, _dt)
    {

    }
    GameLoop(_delta)
    {

    }
    Finish()
    {
        this.finished = true;
    }
}

class StakeAction extends TriggerAction
{
    constructor()
    {
        super();
        
        this.animationTime = 25;
        this.animationTimer = this.animationTime;
    }

    Start()
    {
        battle.enemySprite.stakeShown = true;
        this.animationTimer = this.animationTime;
        battle.enemySprite.SetAnimation(STATE_HANGING, 0);
    }
    GameLoop(_delta)
    {
        this.animationTimer -= 1 * _delta;
        battle.enemySprite.SetAnimation(STATE_HANGING, 1 - this.animationTimer / this.animationTime);
        
        if(this.animationTimer <= 0)
        {
            this.Finish();
        }
    }

    Finish()
    {
        super.Finish();
        battle.enemySprite.SetAnimation(STATE_NORMAL, 0);
    }
}
class PromoDuck extends EnemyData
{
    constructor()
    {
        super();

        this.name = 'ПромоУтка';
        this.index = {x: 0, y: 0};
        this.hp = 500;
        this.maxHP = 500;

        this.scream = 0;
        this.bet = 0;

        this.actions = [
            {name: 'Проверка', index: {x: 0, y: 0}, action: this.Check.bind(this)},
            {name: 'Ставка', index: {x: 0, y: 1}, action: this.Bet.bind(this)},
            {name: 'На помощь', index: {x: 1, y: 0}, action: this.Scream.bind(this)},
        ];
        
        this.flavourText = [
            '* ПромоУтка чистит пёрышки.%* Залысину видно за километр.',
            '* 9 из 36 538 Тунеров рекомендуют!',
            '* Пахнет грифелем.',
            '* ПромоУтка считает свою прибыль.\n* Для этого не нужен калькулятор.',
            '* ПромоУтка ковыряется в зубах.%* Но, скорее, просто грызёт зубочистку...',
        ];
    }

    Start()
    {
        super.Start();

        this.scream = 0;
        this.bet = 0;
    }

    Idle()
    {
        return {
            text: [Utils.RandomArray(this.flavourText)]
        }
    }

    Attack()
    {
        return {
            speech: ['АЙ БЛЯ']
        };
    }

    Check()
    {
        return {
            text: ['* ПромоУтка - АТК 10 ЗЩТ 0\n* Рекламный бизнесмен.%* Древесный сомелье.'],
            speech: ['Кря!']
        };
    }
    Bet()
    {
        this.bet++;

        switch(this.bet)
        {
            case 1:
                return {
                    text: ['* Ты предлагаешь свою ставку.'],
                    speech: ['Один карандаш???\nСейчас ты его только\nпожевать можешь!']
                };
                
            case 2:
                return {
                    text: ['* У тебя всё ещё один карандаш, но ты\n  не сдаёшься.'],
                    speech: ['ОДИН карандаш.\nА ставка 324905.\nПонимаешь?']
                };

            default:
                return {
                    text: ['* Ты третий раз предлагаешь свой карандаш.'],
                    speech: ['Значит так...&0', 'Вот промотка.\nВот текущая ставка.%...И вот сколько\nдо сброса. Жди!'],
                    actions: [
                        this.ShowStake.bind(this)
                    ]
                };
        }
    }

    ShowStake()
    {
        return new StakeAction();
    }

    Scream()
    {
        this.scream++;

        switch(this.scream)
        {
            case 1:
                return {
                    text: ['* Ты позвал Туни...', '* Но никто не пришёл.']
                };

            case 2:
                return {
                    text: ['* Ты позвал Родю...', '* Но никто не пришёл.']
                };

            case 3:
                return {
                    text: ['* Ты позвал Нарушителя...', '* Но никто не пришёл.']
                };

            case 4:
                return {
                    text: ['* Ты позвал ПромоУтку...'],
                    speech: ['Моя харизма\nослепила тебя?%Такое\nУЖЕ СЛУЧАЛОСЬ.'],
                };

            default:
                return {
                    text: ['* Тебе больше некого позвать.', '* Может, попробовать сделать что-то ещё?...']
                };
        }
    }
}