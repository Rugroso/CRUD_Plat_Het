const express = require('express')
const session = require ('express-session')
const app = express()
const port = 3000
const sqlite3 = require('sqlite3').verbose()
const db = new sqlite3.Database('Carrito.db')

app.use(session({
    secret:'SECRETOINSANOWAZA',
    resave: true,
    saveUninitialized:true
}))

app.use(express.json())


function isAuthenticated (req, res, next) {
    if (req.session.user) next()
    else res.status(500).send('Necesitas Iniciar Sesion')
  }

app.get('/home',isAuthenticated, (req, res) => {
    user = (req.session.user).charAt(0).toUpperCase() + (req.session.user).slice(1);
    res.send(200, `Bienvenido, ${user}`  )
})


app.post('/login', (req, res) => {
    user = (req.body.user).toString().toLowerCase()
    console.log(user)
    password = req.body.password 
    if (user == 'rugroso' && password == 'pass123') {
        req.session.user = req.body.user
        req.session.password = req.body.password
        req.session.save(function (err) {
            if (err) return next(err)
            res.redirect('/home')
          })
    } else {
        res.status(401).send('El usuario o la contraseña no son correctos')
    }
})


//PARA CARRITO |||||||
const obtenerEspecial = ( req, res ) => {
  const { id } = req.params;
  query =  query = 'SELECT C.ID, C.Usuario, C.total, sum(p.precio * pc.Cantidad) as Precio_Total FROM CARRITO C INNER JOIN  Productos_Carrito PC ON PC.CarritoId=C.ID INNER JOIN PRODUCTO P ON P.ID=PC.ProductoId WHERE C.ID = ? GROUP BY C.ID, C.Usuario, C.total'
  try {
      db.all(query, [id], (err, row) => {
          if (err) {
              console.error(err.message);
              return res.status(500).send('Error al obtener el elemento');
          }
          
          if (!row) {
              return res.status(404).send('Elemento no encontrado');
          }
          
          return res.send(row);
      });
  } catch (error) {
      console.error('Error en la consulta:', error);
      return res.status(500).send('Error interno del servidor');
  }
}

//Obtener todos los carritos
app.get('/carrito',isAuthenticated, async (req, res) => {
    query = 'SELECT * From Carrito'
    try {
        db.all(query, (err, rows) => {
            if (err) {
                console.error(err.message)
                return res.status(500).send('Error interno del servidor')
            }
            res.send(rows)
        })
    } catch (error) {
        console.error('Error fetching data:', error)
        res.status(500).send('Error interno del servidor')
    }
})

//Obtener un carrito en especifico
app.get('/carrito/:id',isAuthenticated, async (req, res) => {
    query = 'SELECT * From Carrito WHERE Id = ?'
    const { id } = req.params
    try {
        db.all(query,[id], (err, rows) => {
            if (err) {
                console.error(err.message)
                return res.status(500).send('Error interno del servidor')
            }
            res.send(rows)
        })
    } catch (error) {
        console.error('Error fetching data:', error)
        res.status(500).send('Error interno del servidor')
    }
})

//Obtener los carritos con el total
app.get('/carrito/preciototal',isAuthenticated, async (req, res) => {
    query = 'SELECT C.ID, C.Usuario, C.total, sum(p.precio * pc.Cantidad) as Precio_Total FROM CARRITO C INNER JOIN  Productos_Carrito PC ON PC.CarritoId=C.ID INNER JOIN PRODUCTO P ON P.ID=PC.ProductoId GROUP BY C.ID, C.Usuario, C.total'
    try {
        db.all(query, (err, rows) => {
            if (err) {
                console.error(err.message)
                return res.status(500).send('Error interno del servidor')
            }
            res.send(rows)
        })
    } catch (error) {
        console.error('Error fetching data:', error)
        res.status(500).send('Error interno del servidor')
    }
})

app.get('/carrito/preciototal/:id',isAuthenticated, async (req, res) => {
    const { id } = req.params;
    query = 'SELECT C.ID, C.Usuario, C.total, sum(p.precio * pc.Cantidad) as Precio_Total FROM CARRITO C INNER JOIN  Productos_Carrito PC ON PC.CarritoId=C.ID INNER JOIN PRODUCTO P ON P.ID=PC.ProductoId WHERE C.ID = ? GROUP BY C.ID, C.Usuario, C.total'
    try {
        db.all(query, [id], (err, rows) => {
            if (err) {
                console.error(err.message)
                return res.status(500).send('Error interno del servidor')
            }
            res.send(rows)
        })
    } catch (error) {
        console.error('Error fetching data:', error)
        res.status(500).send('Error interno del servidor')
    }
})

//Agregar un nuevo carrito
app.post('/carrito',isAuthenticated, (req, res) => {
    const { usuario } = req.body
    if (!usuario) {
        return res.status(400).send('El usuario es requerido')
    }

    const stmt = db.prepare('INSERT INTO Carrito (Usuario) VALUES (?)')
    stmt.run(usuario, function(err) {
        if (err) {
            console.error(err.message)
            return res.status(500).send('Error al agregar elemento')
        }
        res.status(201).send({ id: this.lastID, usuario })
    })
    stmt.finalize()
})

//Editar la Cantidad | Esto esta puesto en caso de que sea necesario, en realidad no deberia de emplearse debido a que la cantidad se actualiza de forma automatica
app.put('/carrito/:id',isAuthenticated, (req, res) => {
    const { id } = req.params
    const { Total } = req.body

    if (!Total) {
        return res.status(400).send('El nuevo total es requerido')
    }

    const stmt = db.prepare('UPDATE Carrito SET Total = ? WHERE id = ?')
    stmt.run(Total, id, function(err) {
        if (err) {
            console.error(err.message)
            return res.status(500).send('Error al actualizar elemento')
        }
        if (this.changes === 0) {
            return res.status(404).send('Elemento no encontrado')
        }
        res.send({ id, Total })
    })
    stmt.finalize()
})

//Eliminar todos los carritos
app.delete('',isAuthenticated, (req, res) => {
  db.run('DELETE FROM Carrito', function(err) {
      if (err) {
          console.error(err.message)
          return res.status(500).send('Error al vaciar el carrito')
      }
      res.status(200).send('Eliminado con exito')
  })
})

//Eliminar un carrito específico
app.delete('/carrito/:id',isAuthenticated, (req, res) => {
    const { id } = req.params
    obtenerEspecial(req, res)
    const stmt = db.prepare('DELETE FROM Carrito WHERE id = ?')
    stmt.run(id, function(err) {
        if (err) {
            console.error(err.message)
            return res.status(500).send('Error al eliminar elemento')
        }
    })
    stmt.finalize()
})

//PARA PRODUCTO |||||||
const obtenerProductoEspecial = (req, res) => {
    const { id } = req.params;
    try {
        db.get('SELECT * FROM Producto WHERE id = ?', [id], (err, row) => {
            if (err) {
                console.error(err.message);
                return res.status(500).send('Error al obtener el producto');
            }
            
            if (!row) {
                return res.status(404).send('Producto no encontrado');
            }
            
            return res.send(row);
        });
    } catch (error) {
        console.error('Error en la consulta:', error);
        return res.status(500).send('Error interno del servidor');
    }
  }
  
  // Obtener todos los productos
  app.get('/productos',isAuthenticated, async (req, res) => {
      try {
          db.all('SELECT * FROM Producto', (err, rows) => {
              if (err) {
                  console.error(err.message)
                  return res.status(500).send('Error interno del servidor')
              }
              res.send(rows)
          })
      } catch (error) {
          console.error('Error obteniendo productos:', error)
          res.status(500).send('Error interno del servidor')
      }
  })
  
  // Obtener un producto específico
  app.get('/productos/:id',isAuthenticated, async (req, res) => {
    obtenerProductoEspecial(req, res)
  })
  
  // Crear nuevo producto
  app.post('/productos',isAuthenticated, (req, res) => {
      const { nombre, precio } = req.body
      if (!nombre || !precio) {
          return res.status(400).send('Nombre y precio son requeridos')
      }
  
      const stmt = db.prepare('INSERT INTO Producto (Nombre, Precio) VALUES (?, ?)')
      stmt.run(nombre, precio, function(err) {
          if (err) {
              console.error(err.message)
              return res.status(500).send('Error al crear producto')
          }
          res.status(201).send({ 
              id: this.lastID, 
              nombre, 
              precio 
          })
      })
      stmt.finalize()
  })
  
  // Se actualiza el nombre del producto y su precio
  app.put('/productos/:id',isAuthenticated, (req, res) => {
      const { id } = req.params
      const { nombre, precio } = req.body
  
      if (!nombre || !precio) {
          return res.status(400).send('Nombre y precio son requeridos')
      }
  
      const stmt = db.prepare('UPDATE Producto SET Nombre = ?, Precio = ? WHERE id = ?')
      stmt.run(nombre, precio, id, function(err) {
          if (err) {
              console.error(err.message)
              return res.status(500).send('Error al actualizar producto')
          }
          if (this.changes === 0) {
              return res.status(404).send('Producto no encontrado')
          }
          res.send({ 
              id, 
              nombre, 
              precio 
          })
      })
      stmt.finalize()
  })
  
  // Eliminar todos los productos (Solo funcionaría en el caso muy específico de que no se encuentre ningún producto en ningún carrito)
  app.delete('/productos/borrar_todo',isAuthenticated, (req, res) => {
    db.run('DELETE FROM Producto', function(err) {
        if (err) {
            console.error(err.message)
            return res.status(500).send('Error al vaciar los productos')
        }
        res.status(200).send('Todos los productos eliminados exitosamente')
    })
  })
  
  // Eliminar un producto específico (Lo cual, no debería funcionar, dado el caso de que esté en carrito de alguien, debido a llaves foraneas)
  app.delete('/productos/:id',isAuthenticated, (req, res) => {
      const { id } = req.params
      obtenerProductoEspecial(req, res)
      const stmt = db.prepare('DELETE FROM Producto WHERE id = ?')
      stmt.run(id, function(err) {
          if (err) {
              console.error(err.message)
              return res.status(500).send('Error al eliminar producto')
          }
      })
      stmt.finalize()
  })


//SECCION DE PRODUCTOS CARRITO ||||||

//Obtiene todos los carritos y los productos que les corresponden
app.get('/productos_carrito',isAuthenticated, async (req, res) => {
    try {
        db.all('Select C.Usuario, P.Nombre, Cantidad from Productos_Carrito PC inner join Carrito C ON C.id=PC.CarritoId inner join Producto P ON P.id = PC.ProductoId', (err, rows) => {
            if (err) {
                console.error(err.message)
                return res.status(500).send('Error interno del servidor')
            }
            res.send(rows)
        })
    } catch (error) {
        console.error('Error fetching data:', error)
        res.status(500).send('Error interno del servidor')
    }
})


//Productos en carrito, este funciona poniendo el id del carrito (el cual correspondría con el usuario, pero para efectos prácticos, se establece como carrito)
app.get ('/productos_carrito/:id',isAuthenticated, async(req, res) => {
    const { id } = req.params
    query = 'Select C.Usuario, P.Nombre, Cantidad from Productos_Carrito PC inner join Carrito C ON C.id=PC.CarritoId inner join Producto P ON P.id = PC.ProductoId WHERE C.id = ?'
    try {
        db.all(query, [id], (err, rows) => {
            if (err) {
                console.error(err.message);
                return res.status(500).send('Error al obtener el carrito con productos');
            }
            
            if (!rows || rows.length === 0) {
                return res.status(404).send('Carrito con productos no encontrado');
            }
            return res.send(rows);
        });
    } catch (error) {
        console.error('Error en la consulta:', error);
        return res.status(500).send('Error interno del servidor');
    }
})

  // Meter nuevo producto al carrito
  app.post('/productos_carrito/',isAuthenticated, (req, res) => {
    const { carritoId, productoId, cantidad } = req.body
    if (!carritoId || !productoId || !cantidad) {
        return res.status(400).send('Se requieren el Id de carrito, Id de producto y la cantidad a agregar')
    }
    const stmt = db.prepare('INSERT INTO Productos_Carrito (CarritoId, ProductoId, Cantidad) VALUES (?, ?, ?)')
    stmt.run(carritoId, productoId,cantidad, function(err) {
        if (err) {
            console.error(err.message)
            return res.status(500).send('Error al agregar producto al carrito')
        }
        res.status(201).send({ 
            carritoId,
            productoId, 
            cantidad 
        })
    })
    stmt.finalize()
})

// Se actualiza la cantidad de un producto específico
app.put('/productos_carrito/:productoId/carrito/:carritoId',isAuthenticated, async (req, res) => {
    const { productoId, carritoId } = req.params;
    const { cantidad } = req.body;

    const query = 'UPDATE Productos_Carrito SET Cantidad = ? WHERE ProductoId = ? AND CarritoId = ?';

    try {
        db.run(query, [cantidad, productoId, carritoId], function (err) {
            if (err) {
                console.error("Error en la consulta:", err.message);
                return res.status(500).json("No se pudo actualizar la cantidad");
            }

            if (this.changes === 0) {
                return res.status(404).json("Producto no encontrado en el carrito");
            }

            res.status(200).json("Cantidad actualizada exitosamente");
        });
    } catch (error) {
        console.error('Error en la consulta:', error);
        return res.status(500).send('Error interno del servidor');
    }
});



// Con esto es posible eliminar un producto asociado a un carrito
app.delete('/productos_carrito/producto/:productoId/carrito/:carritoId',isAuthenticated, async (req, res) => {
    const { productoId, carritoId } = req.params; 

    const stmt = db.prepare('DELETE FROM Productos_Carrito WHERE ProductoId = ? AND CarritoId = ?');

    stmt.run(productoId, carritoId, function (err) {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Error al eliminar producto');
        }

        if (this.changes === 0) {
            return res.status(404).send('Producto no encontrado en el carrito');
        }

        res.status(200).send('Producto eliminado correctamente');
    });

    stmt.finalize();
});

//Con esto es posible eliminar todos los productos que corresponden a un carrito
app.delete('/productos_carrito/carrito/:carritoId',isAuthenticated, async (req, res) => {
    const { carritoId } = req.params; 

    const stmt = db.prepare('DELETE FROM Productos_Carrito WHERE CarritoId = ?');

    stmt.run(carritoId, function (err) {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Error al eliminar productos del carrito');
        }

        if (this.changes === 0) {
            return res.status(404).send('Usuario no encontrado');
        }

        res.status(200).send('Productos eliminados correctamente');
    });

    stmt.finalize();
});

//Para ver su ejecución
app.listen(port, '0.0.0.0', () => {
    console.log(`Servidor ejecutándose en http://0.0.0.0:${port}`);
  });