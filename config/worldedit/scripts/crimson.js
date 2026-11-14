importPackage(Packages.com.sk89q.worldedit);
importPackage(Packages.com.sk89q.worldedit.blocks);

var session = context.getSession();
var player = context.getPlayer();
var world = player.getWorld();

var origin = player.getBlockIn();

function set(x,y,z,id){
    session.setBlock(
      new Vector(
        origin.getX()+x,
        origin.getY()+y,
        origin.getZ()+z),
      new BaseBlock(id)
    );
}

var W = 96;
var L = 96;
var H = 32;

/* пол */
for(var x=-48;x<=48;x++){
 for(var z=-48;z<=48;z++){
   set(x,0,z,213);
 }
}

/* стены */
for(var y=1;y<=H;y++){
 for(var x=-48;x<=48;x++){
   set(x,y,-48,213);
   set(x,y,48,213);
 }

 for(var z=-48;z<=48;z++){
   set(-48,y,z,213);
   set(48,y,z,213);
 }
}

/* колонны */
var col = [-36,-24,-12,12,24,36];

for(var i=0;i<col.length;i++){

 for(var y=1;y<=24;y++){

   set(col[i],y,-18,213);
   set(col[i],y,18,213);

   set(col[i]+1,y,-18,213);
   set(col[i]+1,y,18,213);

   set(col[i],y,-17,213);
   set(col[i],y,19,213);

 }
}

/* лавовые каналы */

for(var x=-40;x<=40;x++){

 for(var z=-30;z<=-24;z++){

   set(x,-1,z,11);

 }

 for(var z=24;z<=30;z++){

   set(x,-1,z,11);

 }

}

/* мост */

for(var x=-8;x<=8;x++){
 for(var z=-30;z<=30;z++){
   set(x,1,z,213);
 }
}

/* трон */

for(var y=1;y<=8;y++){

 for(var x=-10;x<=10;x++){

  for(var z=35;z<=48;z++){

    if(z > 48-y)
      set(x,y,z,213);

  }
 }

}

/* арена босса */

for(var x=-15;x<=15;x++){
 for(var z=55;z<=85;z++){

  set(x,0,z,112);

 }
}

player.print("Crimson Throne generated");