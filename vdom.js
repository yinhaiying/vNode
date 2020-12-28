const vNodeType = {
    HTML: "HTML",
    TEXT: "TEXT",
    COMPONENT: "COMPONENT",
    CLASS_COMPONENT: "CLASS_COMPONENT"
}
const childrenType = {
    EMPTY: "EMPTY",
    SINGLE: "SINGLE",
    MULTIPLE: "MULTIPLE"
}


// 新建虚拟DOM  createElement

// 标签名，属性，子元素
function createElement(tag, data, children = null) {
    let flag; // 用于标记元素的类型
    if (typeof tag === "string") {
        //元素是一个普通的html标签
        flag = vNodeType.HTML;
    } else if (typeof tag === "function") {
        flag = vNodeType.COMPONENT
    } else {
        flag = vNodeType.TEXT
    }
    let childrenFlag; // 用于标记子元素的类型，没有子元素，一个子元素和多个子元素
    if (children == null) {
        childrenFlag = childrenType.EMPTY;
    } else if (Array.isArray(children)) {
        let len = children.length;
        if (len === 0) {
            childrenFlag = childrenType.EMPTY;
        } else if (len >= 1) {
            childrenFlag = childrenType.MULTIPLE;
        }
    } else {
        //其他情况认为是文本
        childrenFlag = childrenType.SINGLE;
        children = createTextVNode(children + "")
    }

    // 返回vNode
    return {
        tag, // 如果是文本，没有tag，如果是组件，就是一个函数
        flag, // vnode类型
        data,
        children,
        childrenFlag,
        el: null
    }
}


// 创建文本类型的虚拟DOM
function createTextVNode(text) {
    return {
        flag: vNodeType.TEXT,
        tag: null,
        data: null,
        children: text,
        childrenFlag: childrenType.EMPTY
    }
}

// 如何渲染 render

function render(vNode, container) {
    // 区分首次渲染和再次渲染,再次渲染需要进行diff。
    console.log("vNode", container.vNode);
    if (container.vNode) {
        // 更新 TODO:这里有点问题
        console.log("再次渲染执行这里")
        patch(container.vNode, vNode, container);
    } else {
        // 首次渲染
        mount(vNode, container)
    }
    container.vNode = vNode;
}

// DOM diff 算法
function patch(prev, next, container) {
    console.log("prev:", prev);
    console.log("next:", next);
    let nextVNodeType = next.flag;
    let prevVNodeType = prev.flag;
    if (nextVNodeType !== prevVNodeType) {
        // 如果节点类型不同，则直接替换  HTML,TEXT或者组件类型
        replaceVNode(prev, next, container);
    } else if (nextVNodeType === "HTML") {
        // HTML类型的对比
        patchElement(prev, next, container);
    } else if (nextVNodeType === "TEXT") {
        // TEXT类型的对比
        patchText(prev, next, container);
    }
}

// 直接替换原来的节点
function replaceVNode(prev, next, container) {
    container.removeChild(prev.el);
    mount(next, container);
}

function patchText(prev, next, container) {
    let el = next.el;
    if (next.children !== prev.children) {
        el && (el.nodeValue = next.children);
    }
}

function patchElement(prev, next, container) {
    if (next.tag !== prev.tag) {
        // 元素标签不同，直接替换
        replaceVNode(prev, next, container);
        return;
    }
    // 如果元素相同
    let el = (next.el = prev.el);
    let prevData = prev.data;
    let nextData = next.data;
    if (nextData) {
        // 更新
        console.log("更新:")
        for (let key in nextData) {
            let prevVal = prevData[key];
            let nextVal = nextData[key]
            patchData(el, key, prevVal, nextVal)
        }
    }
    // 删除老的里面一些新的没有的属性
    if (prevData) {
        for (let key in prevData) {
            let prevVal = prevData[key];
            if (prevVal && !nextData.hasOwnProperty(key)) {
                patchData(el, key, prevVal, null)
            }
        }
    }
    // data 更新完毕 下面更新子元素
    patchChildren(
        prev.childrenFlag,
        next.childrenFlag,
        prev.children,
        next.children,
        el
    )


}

// patchChildren

function patchChildren(
    prevChildrenFlag,
    nextChildrenFlag,
    prevChildren,
    nextChildren,
    container) {
    // 更新子元素
    switch (prevChildrenFlag) {
        case childrenType.EMPTY:
            switch (nextChildrenFlag) {
                case childrenType.EMPTY:
                    // 两次都是空的，不需要处理
                    break;
                case childrenType.SINGLE:
                    // 只有原来不存在，新的存在时才需要进行挂载
                    mount(nextChildren, container);
                    break;
                case childrenType.MULTIPLE:
                    // 原来是空的，现在是多个子元素，那么就直接挂载多个子元素即可。
                    for (let i = 0; i < nextChildren.length; i++) {
                        mount(nextChildren[i], container);
                    }
                    break;
            }
            break;
        case childrenType.SINGLE:
            switch (nextChildrenFlag) {
                case childrenType.EMPTY:
                    // 老的是单个文本，新的是空，说明要删除老的。
                    container.removeChild(prevChildren.el);
                    break;
                case childrenType.SINGLE:
                    // 两个都是SINGLE说明都是简单的字符串，
                    patch(prevChildren, nextChildren, container);
                    break;
                case childrenType.MULTIPLE:
                    // 先把旧的干掉，然后添加新的。只有需要添加时，才需要进行挂载
                    // TODO:其实不应该是这样简单处理，正常应该需要根据key来判断
                    container.removeChild(prevChildren.el);
                    for (let i = 0; i < nextChildren.length; i++) {
                        mount(nextChildren[i], container);
                    }
                    break;
            }
            break;
        case childrenType.MULTIPLE:
            switch (nextChildrenFlag) {
                case childrenType.EMPTY:
                    // 如果旧的是多个，先遍历删除，然后添加新的。
                    // 新的是单个，删除新的。
                    for (let i = 0; i < prevChildren.length; i++) {
                        container.removeChild(prevChildren[i].el);
                    }
                    break;
                case childrenType.SINGLE:
                    // 如果旧的是多个，先遍历删除，然后添加新的。
                    for (let i = 0; i < prevChildren.length; i++) {
                        container.removeChild(prevChildren[i].el);
                    }
                    mount(nextChildren, container);
                    break;
                case childrenType.MULTIPLE:
                    // 众多虚拟DOM，在这里进行优化
                    // 老的是个数组，新的也是个数组
                    console.log("新老都是数组");
                    // 根据相对顺序来进行判断
                    let lastIndex = 0;
                    for (let i = 0; i < nextChildren.length; i++) {
                        let isFind = false;
                        let nextVNode = nextChildren[i];
                        let j = 0;
                        console.log("nextChildren:", nextChildren[i])
                        for (j; j < prevChildren.length; j++) {
                            let preVNode = prevChildren[j];
                            if (preVNode.data.key === nextVNode.data.key) {
                                isFind = true;
                                // key相同，表示是同一个元素
                                patch(preVNode, nextVNode, container);
                                if (j < lastIndex) {
                                    // 需要移动元素 insertBefore移动元素
                                    // abc a 移动到b之后。那么需要找到新的位置的前一个,insertBefore(b的下一个元素)
                                    // 找到新的位置的前一个，然后进行插入
                                    let flagNode = nextChildren[i - 1].el.nextSibling;
                                    container.insertBefore(preVNode.el, flagNode);
                                } else {
                                    lastIndex = j;
                                }
                            }
                            console.log("preVNode.key:", preVNode.key, "nextVNode.key", nextVNode.key, "isFind:", isFind)
                        }
                        if (!isFind) {
                            console.log("是新增的元素")
                            let flagNode = i === 0 ? prevChildren.el : nextChildren[i - 1].el.nextSibling;
                            // 表示是需要新增的元素
                            mount(nextVNode, container, flagNode)
                        }
                    }
                    // 移除不需要的元素
                    console.log("接下来执行移除不需要的元素")
                    for (let i = 0; i < prevChildren.length; i++) {
                        const preVNode = prevChildren[i];
                        const has = nextChildren.find(next => next.key === preVNode.key);
                        if (!has) {
                            container.removeChild(preVNode.el);
                        }
                    }
                    break;
            }
            break;
    }

}


// mount
function mount(vNode, container, flagNode) {
    let {
        flag
    } = vNode;

    if (flag == vNodeType.HTML) {
        mountElement(vNode, container, flagNode);
    } else if (flag = vNodeType.TEXT) {
        mountText(vNode, container);
    }
}

//挂载元素
function mountElement(vNode, container, flagNode) {
    let dom = document.createElement(vNode.tag);
    vNode.el = dom;
    let {
        data,
        children,
        childrenFlag
    } = vNode;
    // 挂载data
    if (data) {
        for (let key in data) {
            // 节点，名字，老值，新值.
            patchData(dom, key, null, data[key])
        }
    }
    // 挂载子元素
    if (childrenFlag !== childrenType.EMPTY) {
        if (childrenFlag === childrenType.SINGLE) {
            mount(children, dom)
        } else if (childrenFlag === childrenType.MULTIPLE) {
            for (let i = 0; i < children.length; i++) {
                mount(children[i], dom);
            }
        }
    }
    if (flagNode) {
        container.insertBefore(dom, flagNode);
    } else {
        container.appendChild(dom);
    }

}

// 挂载文本
function mountText(vNode, container) {
    let dom = document.createTextNode(vNode.children);
    vNode.el = dom;
    container.appendChild(dom);
}


// 挂载data
function patchData(el, key, prev, next) {
    switch (key) {
        case "style":
            for (let k in next) {
                el.style[k] = next[k];
            }
            for (let k in prev) {
                if (next && !next.hasOwnProperty(k)) {
                    el.style[k] = "";
                }
            }
            break;
        case "class":
            el.className = next;
            break;
        default:
            if (key[0] === "@") {
                console.log("prev:", prev);
                console.log("next:", next);
                if (prev) {
                    el.removeEventListener(key.slice(1), prev)
                }
                if (next) {
                    el.addEventListener(key.slice(1), next);
                }
            } else {
                el.setAttribute(key, next);
            }
            break;
    }
}