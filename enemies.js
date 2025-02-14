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

        this.actions = [
            {name: 'Проверка', index: {x: 0, y: 0}, action: this.Check.bind(this)},
            {name: 'Ставка', index: {x: 0, y: 1}, action: this.Deal.bind(this)},
            {name: 'Крик', index: {x: 1, y: 0}, action: this.Scream.bind(this)},
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
    Deal()
    {
        return {
            text: ['* Ты предлагаешь свою ставку.\n* Но у тебя лишь один карандаш.']
        };
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