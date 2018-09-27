function ArkFactory(){

    var Obj = {
        contracts:{},
        leftBouns:1000,
        next_lock:0
    };

    function atAccount(callback,id){
        web3.eth.getAccounts(function(error, accounts) {
            if (error) {
                console.log(error);
            }
            if(accounts.length > 0){
                var account = accounts[(id==undefined)?0:id];
                callback(account);
            } else{
                alert("请登录!");
            }
        });
    }


    function onBuyCards(lotteryInstance,account){
        lotteryInstance.buyCards({address:account},{fromBlock:0,toBlock:'latest'},function (error, logs) {
            // console.log(logs.args.adr);
            // console.log(logs.args.value);
            // console.log(logs.args.start);
            // console.log(logs.args.end);
            var keysLeft = $.MyStorage['keysLeft'];
            if(keysLeft == undefined || keysLeft > logs.args.start ){
                var str = $.MyStorage[account];
                var obj;
                if(str==undefined){
                    obj = [];
                }else{
                    eval('obj='+str);
                }
                for (var i = logs.args.start; i >= logs.args.end; i--){
                    obj.push(i);
                }
                $.MyStorage[account]= JSON.stringify(obj);
                $('#ark_left_card_num').html(obj.length);
                // console.log($.MyStorage[account]);
                $.MyStorage['keysLeft'] = logs.args.end;
            }

        });
    }
    function onWin(lotteryInstance,account){
        lotteryInstance.win({},{fromBlock:0,toBlock:'latest'},function (error, logs) {
            adr = logs.args.adr;
            bonus = web3.fromWei(logs.args.bonus);
            $("#ark_bonus_message").prepend("<tr><td>"+adr.substr(2,6)+"...."+adr.substr(-4)+"</td><td>"+bonus+"</td></tr>");
            (Obj.leftBouns = Obj.leftBouns - bonus);
            $("#ark_bonus_left").html(Obj.leftBouns.toFixed(2)+"ETH");

            $("#ark_bonus_self_history").prepend('<li class="list-group-item" style="background-color: #2d3238;">'+
                bonus
                +' ETH</li>');
        });
    }
    function onSendBonusLog(lotteryInstance,account){
        lotteryInstance.sendBonusLog({address:account},{fromBlock:0,toBlock:'latest'},function (error, logs) {
            console.log(logs.args.adr);
            console.log(logs.args.amount);
        });
    }

    function onClickFastEth() {
        $(".ark_fast_eth_input").on('click',function () {
            var ret = isNaN(parseInt($('#tixToBuy').val()))?parseInt(this.value):parseInt(this.value)+parseInt($('#tixToBuy').val());
            $('#tixToBuy').val(ret);
            $('#tixQuotation').html('@ '+(ret*0.01).toFixed(2)+' ETH');
        });
    }

    function onTopUp(cost) {
        atAccount(function (account) {
            Obj.contracts.Lottery.deployed().then(function(lotteryInstance) {
                return lotteryInstance.topUp({from: account,value:cost});
            }).then(function(result) {
                // console.log("充值:"+result);
            }).catch(function(err) {
                console.log(err.message);
            });
        });
    }

    function ScratchCard(id) {
        atAccount(function (account) {
            Obj.contracts.Lottery.deployed().then(function(lotteryInstance) {
                return lotteryInstance.scratchCard(id,{from: account});
            }).then(function(result) {
                // console.log("充值:"+result);
            }).catch(function(err) {
                console.log(err.message);
            });
        });
    }

    function onClickTixBuy() {
        $("#tixBuy").on('click',function () {
            event.preventDefault();
            var ret = isNaN(parseInt($('#tixToBuy').val()))?0:$('#tixToBuy').val()/100;
            var cost = web3.toWei(ret,'ether');
            onTopUp(cost);
        });
    }

    function getInfos() {
        atAccount(function (account) {
            var str = $.MyStorage[account];
            eval('var obj='+str);
            var next = obj.pop();
            $.MyStorage[account] = JSON.stringify(obj);
            $('#ark_left_card_num').html(obj.length);
            Obj.contracts.Lottery.deployed().then(function(lotteryInstance) {
                return lotteryInstance.getKeysLeft.call();
            }).then(function (r) {
                console.log(r);
            });
            Obj.contracts.Lottery.deployed().then(function(lotteryInstance) {
                return lotteryInstance.getCards.call(99999,{from: account});
            }).then(function (r) {
                console.log(r);
            });
        });
    }


    function onScratchCard() {
        var hastouch = "ontouchstart" in window?true:false,
            tapstart = hastouch?"touchstart":"mousedown";
        $('#ark_scratch_card').on(tapstart,function () {
            if(Obj.next_lock){
                return;
            }
            atAccount(function (account) {
                var str = $.MyStorage[account];
                eval('var obj='+str);
                var next = obj.pop();
                $.MyStorage[account] = JSON.stringify(obj);
                $('#ark_left_card_num').html(obj.length);
                if(next != undefined){
                    Obj.contracts.Lottery.deployed().then(function(lotteryInstance) {
                        return lotteryInstance.getCards.call(next,{from: account});
                    }).then(function (r) {
                        if(r[1]!='0' && r[1]!=0){
                            $('#ark_card_info').html('现在开抢:'+r[1]+'等奖,手快有手慢无！');
                            setTimeout(function () {
                                //alert('开抢！');
                                ScratchCard(next);
                                $('#ark_scratch_card')[0].markit();
                                Obj.next_lock = 0;
                            },3000);
                        }else{
                            $('#ark_card_info').html('谢谢惠顾！');
                            setTimeout(function () {
                                $("#ark_bonus_self_history").prepend('<li class="list-group-item" style="background-color: #2d3238;">谢谢惠顾</li>');
                                $('#ark_scratch_card')[0].markit();
                                Obj.next_lock = 0;
                            },3000);
                        }
                    });
                }else{
                    alert("需要购买新奖券！");
                }
            });
        });
    }

    function init() {
        if (typeof web3 !== 'undefined') {
            var web3Provider = web3.currentProvider;
            web3 = new Web3(web3.currentProvider);

            $.getJSON('Lottery.json', function(data) {
                Obj.contracts.Lottery = TruffleContract(data);
                Obj.contracts.Lottery.setProvider(web3Provider);

                // getInfos();
                atAccount(function (account) {
                    Obj.contracts.Lottery
                        .deployed().then(function(lotteryInstance) {
                            onBuyCards(lotteryInstance,account);
                            onWin(lotteryInstance,account);
                            onSendBonusLog(lotteryInstance,account);
                        });
                });
                onClickFastEth();
                onClickTixBuy();
                onScratchCard();
                getInfos();
            });
        } else {
            alert("请安装MetaMask钱包,并刷新!");
        }
    };

    return {init:init}

};

$(function () {

    if(!window.localStorage){
        alert("浏览器版本过低!");
    }else{
        $.MyStorage = window.localStorage;
        $.EtherArk = ArkFactory();
        $.EtherArk.init();
    }
})


