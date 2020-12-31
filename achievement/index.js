// 创建虚拟DOM函数
const vNodeTypes = {
  HTML: "HTML",
  TEXT: "TEXT",
  COMPONENT: "COMPONENT",
  CLASS_COMPONENT: "CLASS_COMPONENT",
};
const childTypes = {
  EMPTY: "EMPTY",
  SINGLE: "SINGLE",
  MULTIPLE: "MULTIPLE",
};

function createElement(tag, data, children) {
  let vNodeType;
  if (typeof tag === "string") {
    //元素是一个普通的html标签
    vNodeType = vNodeTypes.HTML;
  } else if (typeof tag === "function") {
    vNodeType = vNodeTypes.COMPONENT;
  } else {
    vNodeType = vNodeTypes.TEXT;
  }
  let childType;
  if (children === null) {
    childType = childTypes.EMPTY;
  } else if (Array.isArray(children)) {
    if (children.length === 0) {
      childType = childTypes.EMPTY;
    } else if (children.length >= 1) {
      childType = childTypes.MULTIPLE;
    }
  } else {
    childType = childTypes.SINGLE;
    children = createTextVNode(children + "")
  }

  return {
    tag,
    vNodeType,
    data,
    children,
    childType,
    el:null
  };
}

function createTextVNode(text) {
  return {
    vNodeType: vNodeTypes.TEXT,
    tag: null,
    data: null,
    children: text,
    childType: childTypes.EMPTY,
  };
}

function render(vNode, container) {
  if (container.vNode) {
    // 说明不是首次渲染
    patch(container.vNode, vNode, container);
  } else {
    mount(vNode, container);
  }
  // 每次渲染完成之后都把vNode挂载到container身上
  container.vNode = vNode;
}
function mount(vNode, container,flagNode) {
  const { vNodeType } = vNode;
  // 不同的节点，有不同的挂载方式。文本节点单独处理
  if (vNodeType == vNodeTypes.HTML) {
    mountElement(vNode, container, flagNode);
  } else if (vNodeType === vNodeTypes.TEXT) {
    mountText(vNode, container);
  }
}

function mountElement(vNode, container, flagNode) {
  const { tag, childType, children, data } = vNode;
  const dom = document.createElement(tag);
  vNode.el = dom;
  // 处理data
  if (data) {
    for (let key in data) {
      // 节点，名字，老值，新值.
      patchData(dom, key, null, data[key]);
    }
  }

  if (childType === childTypes.SINGLE) {
    mount(vNode.children, dom);
  } else if (childType === childTypes.MULTIPLE) {
    for (let i = 0; i < children.length; i++) {
      let child = children[i];
      mount(child, dom);
    }
  }
  if (flagNode) {
    container.insertBefore(dom, flagNode);
  } else {
    container.appendChild(dom);
  }
}

function mountText(vNode, container) {
  const text = vNode.children ? vNode.children:vNode;
  let dom = document.createTextNode(text);
  vNode.el = dom;
  container.appendChild(dom);
}

function patchData(el, key, oldValue, newValue) {
  switch (key) {
    case "style":
      if (newValue) {
        for (let k in newValue) {
          el.style[k] = newValue[k];
        }
      }
      if (oldValue) {
        for (let k in oldValue) {
          if (newValue && !newValue.hasOwnProperty(k)) {
            el.style[k] = "";
          }
        }
      }
      break;
    case "class":
      el.className = newValue;
      break;
    case "default":
      el.setAttribute(key, newValue);
      break;
  }
}
function patch(oldVNode, newVNode, container) {
  const oldVNodeType = oldVNode.vNodeType;
  const newVNodeType = newVNode.vNodeType;
  if (oldVNodeType !== newVNodeType) {
    replaceVNode(oldVNode, newVNode, container);
  } else {
    // 标签相同情况下的处理
    if (newVNodeType === vNodeTypes.HTML) {
      // 标签为HTML的情况下的处理
      console.log("标签情况下的比较")
      patchElement(oldVNode, newVNode, container);
    } else if (newVNodeType === vNodeTypes.TEXT) {
      // 标签为TEXT的情况下的处理
      console.log("TEXT情况下的比较")
      patchText(oldVNode, newVNode, container);
    }
  }
}

function replaceVNode(oldVNode, newVNode, container) {
  container.removeChild(oldVNode.el);
  mount(newVNode, container);
}

function patchElement(oldVNode, newVNode, container) {
  const {
    tag: oldVNodeTag,
    data: oldData,
    children: oldChildren,
    childType: oldChildType,
    el,
  } = oldVNode;
  const {
    tag: newVNodeTag,
    data: newData,
    children: newChildren,
    childType: newChildType,
  } = newVNode;
  // 如果标签不同，直接天魂
  if (oldVNodeTag !== newVNodeTag) {
    replaceVNode(oldVNode, newVNode, container);
  } else {
    newVNode.el = el;
    // 如果元素相同，则处理data
    processData(oldData, newData, el);
    // 如果元素相同，则处理children
    patchChildren(
      oldChildren,
      oldChildType,
      newChildren,
      newChildType,
      el
    );
  }
}

// patchChildren 对比children

function patchChildren(
  oldChildren,
  oldChildType,
  newChildren,
  newChildType,
  container
) {
  switch (oldChildType) {
    case childTypes.EMPTY:
      switch (newChildType) {
        case childTypes.EMPTY:
          break;
        case childTypes.SINGLE:
            mountText(newChildren,container)
          break;
        case childTypes.MULTIPLE:
            for(let i = 0;i < newChildren.length;i++){
                mount(newChildren[i],container);
            }
          break;
      }

      break;
    case childTypes.SINGLE:
      switch (newChildType) {
        case childTypes.EMPTY:
            container.removeChild(oldChildren.el);
          break;
        case childTypes.SINGLE:
            patchText(oldChildren,newChildren,container)
          break;
        case childTypes.MULTIPLE:
            container.removeChild(oldChildren.el);
            for (let i = 0; i < newChildren.length; i++) {
                mount(newChildren[i], container);
            }
          break;
      }
      break;
    case childTypes.MULTIPLE:
      switch (newChildType) {
        case childTypes.EMPTY:
            for (let i = 0; i < oldChildren.length; i++) {
                container.removeChild(oldChildren[i].el);
            }
          break;
        case childTypes.SINGLE:
            for (let i = 0; i < oldChildren.length; i++) {
                container.removeChild(oldChildren[i].el);
            }
            mountText(newChildren, container)
          break;
        case childTypes.MULTIPLE:
          updateChildren(oldChildren,newChildren,container)
          break;
      }
      break;
    default:
      break;
  }
}

function updateChildren(oldChildren,newChildren,container){
    console.log("updateChildren", oldChildren,newChildren);
    let lastIndex = 0;
    for(let i = 0;i < newChildren.length;i++){
      let newVNode = newChildren[i];
      console.log("newVNode",newVNode)
      let isFind = false;
      for(let j = 0;j < oldChildren.length;j++){
        let oldVNode = oldChildren[j];
        if(newVNode.data.key === oldVNode.data.key){
          // key值相等才进行比较
          patch(oldVNode,newVNode,container);
          isFind = true;  // 表示前后都存在这个元素，说明不是新增的元素
          // 当前元素在旧节点中是在它前面的，现在在它后面了。
          if (j < lastIndex) {
            // 需要移动元素 insertBefore移动元素
            // abc a 移动到b之后。那么需要找到新的位置的前一个,insertBefore(b的下一个元素)
            // 找到新的位置的前一个，然后进行插入
            let flagNode = newChildren[i - 1].el.nextSibling; // 找到要插入位置的下一个元素
            container.insertBefore(oldVNode.el, flagNode);
          } else {
            // 记录在旧节点中的位置
            lastIndex = j;
          }
        }
      }
      // 没有找到说明是新增的元素，因此需要插入到指定位置
      if(!isFind){
          let flagNode = i === 0 ? oldChildren.el : newChildren[i - 1].el.nextSibling;
          // 表示是需要新增的元素
          mount(nextVNode, container, flagNode)
      }
    }
    // 删除不需要的元素
    for (let i = 0; i < oldChildren.length; i++) {
      console.log("删除不需要的元素:")
      const preVNode = oldChildren[i];
      const has = newChildren.find(next => next.data.key === preVNode.data.key);
      if (!has) {
        container.removeChild(preVNode.el);
      }
    }
}


function processData(oldData, newData, el) {
  // 更新
  if (newData) {
    for (let key in newData) {
      let oldValue = oldData[key];
      let newValue = newData[key];
      patchData(el, key, oldValue, newValue);
    }
  }
  // 删除一些不存在的属性
  if (oldData) {
    for (let key in oldData) {
      let oldValue = oldData[key];
      if (oldValue && !newData.hasOwnProperty(key)) {
        el && patchData(el, key, oldValue, null);
      }
    }
  }
}

function patchText(oldVNode, newVNode, container) {
  if (newVNode.children !== oldVNode.children) {
    oldVNode.el.nodeValue = newVNode.children;
  }
}
