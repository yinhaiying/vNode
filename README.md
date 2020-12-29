# 虚拟DOM的理解




## dom diff时为什么需要移动？
```
"children": [
    {
      "tag": "p",
      "flag": "HTML",
      "data": {
        "key": "a",
        "style": {
          "color": "red",
          "background": "green"
        }
      },
      "children": {
        "flag": "TEXT",
        "tag": null,
        "data": null,
        "children": "节点1",
        "childrenFlag": "EMPTY"
      },
      "childrenFlag": "SINGLE",
      "el": null
    },
    {
      "tag": "p",
      "flag": "HTML",
      "data": {
        "key": "d"
      },
      "children": {
        "flag": "TEXT",
        "tag": null,
        "data": null,
        "children": "节点4",
        "childrenFlag": "EMPTY"
      },
      "childrenFlag": "SINGLE",
      "el": null
    },
    {
      "tag": "p",
      "flag": "HTML",
      "data": {
        "key": "b",
        "class": "item"
      },
      "children": {
        "flag": "TEXT",
        "tag": null,
        "data": null,
        "children": "节点2",
        "childrenFlag": "EMPTY"
      },
      "childrenFlag": "SINGLE",
      "el": null
    }
```
由于之前的vNode假设顺序是[“节点1”，“节点4”，“节点2”]，对应的顺序是0,1,2。也就是说目前他们在DOM上的顺序也是0,1,2。节点1在前面，然后跟着节点4，再然后跟着节点2。
然后这次进行了修改，变成了[“节点4”，“节点1”，“节点2”]。
```javascript
"children": [
    {
      "tag": "p",
      "flag": "HTML",
      "data": {
        "key": "d"
      },
      "children": {
        "flag": "TEXT",
        "tag": null,
        "data": null,
        "children": "节点4",
        "childrenFlag": "EMPTY"
      },
      "childrenFlag": "SINGLE",
      "el": null
    },
    {
      "tag": "p",
      "flag": "HTML",
      "data": {
        "key": "a",
        "style": {
          "color": "blue"
        }
      },
      "children": {
        "flag": "TEXT",
        "tag": null,
        "data": null,
        "children": "节点1",
        "childrenFlag": "EMPTY"
      },
      "childrenFlag": "SINGLE",
      "el": null
    },
    {
      "tag": "p",
      "flag": "HTML",
      "data": {
        "key": "b",
        "class": "item"
      },
      "children": {
        "flag": "TEXT",
        "tag": null,
        "data": null,
        "children": "节点2",
        "childrenFlag": "EMPTY"
      },
      "childrenFlag": "SINGLE",
      "el": null
    }
  ],

```
由于新旧vNode的修改，不是删除原来的元素，然后全部创建新的元素。而是通过Key值找到对应的元素，然后进行修改。但是这样的修改，虽然内容上完成了修改，但是位置上却保持了原来的位置，仍然是节点1在前，然后是节点4，然后是节点2。这与新的vNode渲染后得到的DOM树是不一致的。因此，我们除了修改data还需要修改他的元素对应的位置。因此，我们判断哪个元素需要移动，然后进行相对应的操作。
判断的标准就是两个相邻的元素的顺序是否发生了变化。如果原来是递增的，现在还是递增的，那么就不需要发生移动，如果原来是递增的，现在变成递减了，那么就需要发生移动。
比如：[“节点1”，“节点4”，“节点2”]中节点1和节点4原来的顺序是0,1递增的。
但是新的vNode变成了[“节点4”，“节点1”，“节点2”]，节点1和节点4的顺序是1,0递减的，说明节点1需要移动位置。他需要插入到节点4的后面。如何插入？
由于节点的插入只有appendChild和insertBefore。这里我们无法使用appendChild。因此需要使用insertBefore。找到节点4的下一个元素，然后插入即可。
